import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as https from 'https';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entity/ticket.entity';
import { User } from '../entity/user.entity';

interface Article {
  name: string;
  price: number;
  quantity?: number;
}

interface ExtractedData {
  total: number | null;
  date: string | null;
  merchant: string | null;
  tva: number | null;
  articles: Article[];
  confidence: number;
  cleanedText: string;
}

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  // Liste étendue d'enseignes françaises
  private readonly STORE_NAMES = [
    'CARREFOUR MARKET', 'CARREFOUR CITY', 'CARREFOUR EXPRESS', 'CARREFOUR',
    'E.LECLERC', 'LECLERC', 'AUCHAN DRIVE', 'AUCHAN',
    'MONOPRIX', 'MONOP', 'FRANPRIX', 'INTERMARCHÉ', 'INTERMARCHE',
    'LIDL', 'ALDI', 'CASINO', 'CORA', 'SIMPLY MARKET', 'SIMPLY',
    'SUPER U', 'HYPER U', 'MARCHÉ U', 'SYSTÈME U', 'U EXPRESS',
    'SPAR', 'NETTO', 'PICARD', 'BIOCOOP', 'NATURALIA',
    'LA VIE CLAIRE', 'GRAND FRAIS', 'MATCH', 'LEADER PRICE',
    'COLRUYT', 'METRO', 'COSTCO', 'PROMOCASH',
    'BRICO DÉPÔT', 'BRICO DEPOT', 'BRICOMARCHÉ', 'BRICOMARCHE',
    'LEROY MERLIN', 'CASTORAMA', 'IKEA', 'DECATHLON',
    'FNAC', 'DARTY', 'BOULANGER', 'CULTURA',
    'H&M', 'ZARA', 'PRIMARK', 'KIABI', 'JULES', 'CELIO', 'UNIQLO',
    'MCDONALD', 'MC DONALD', 'MCDO', 'KFC', 'BURGER KING',
    'PAUL', 'BRIOCHE DORÉE', 'BRIOCHE DOREE',
    'RELAY', 'TABAC', 'PHARMACIE', 'AMAZON', 'ACTION',
  ];

  // Corrections OCR enrichies
  private readonly OCR_CORRECTIONS: [RegExp, string][] = [
    // TOTAL
    [/\bT0TAL\b/gi, 'TOTAL'],
    [/\bTUTAL\b/gi, 'TOTAL'],
    [/\bT[O0]TAI\b/gi, 'TOTAL'],
    [/\[\s*OTAL\b/gi, 'TOTAL'],
    [/\(\s*OTAL\b/gi, 'TOTAL'],
    [/\bTOTAl\b/g, 'TOTAL'],
    // EUR / €
    [/\bLUR\b/gi, 'EUR'],
    [/\bLIRR\b/gi, 'EUR'],
    [/\bEUR0\b/gi, 'EURO'],
    // TVA
    [/\bTVfl\b/gi, 'TVA'],
    [/\bTVf\b/gi, 'TVA'],
    [/\bT\.V\.A\b/gi, 'TVA'],
    // NET / PAYER
    [/\bNEr\b/gi, 'NET'],
    [/\bPA¥ER\b/gi, 'PAYER'],
    [/\bPAYEl\b/gi, 'PAYER'],
    // Confusions 0/O et 1/l dans les chiffres
    [/(\d)[Ol](\d)/g, '$10$2'],
    [/(\d)[Il](\d)/g, '$11$2'],
  ];

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  // ─── Preprocessing ────────────────────────────────────────────────────────

  /**
   * Crée plusieurs variantes prétraitées pour maximiser la reconnaissance OCR.
   * Retourne les chemins créés pour nettoyage ultérieur.
   */
  private async createPreprocessedVariants(
    inputPath: string,
  ): Promise<{ path: string; name: string }[]> {
    const variants: { path: string; name: string }[] = [];
    const base = inputPath.replace(/\.(jpg|jpeg|png)$/i, '');

    const tasks: { suffix: string; name: string; pipeline: (img: sharp.Sharp) => sharp.Sharp }[] = [
      {
        suffix: '_light',
        name: 'light',
        // Léger : niveaux de gris + normalisation + netteté — bon pour les tickets lisibles
        pipeline: img =>
          img
            .resize(2500, 3500, { fit: 'inside', withoutEnlargement: false })
            .greyscale()
            .normalize()
            .sharpen(),
      },
      {
        suffix: '_bin',
        name: 'binarisé',
        // Binarisation : idéal pour les tickets imprimés sur papier thermique
        pipeline: img =>
          img
            .resize(2500, 3500, { fit: 'inside', withoutEnlargement: false })
            .greyscale()
            .normalize()
            .sharpen()
            .threshold(130),
      },
      {
        suffix: '_hc',
        name: 'haut-contraste',
        // Haute résolution + seuil bas : pour les tickets délavés ou froissés
        pipeline: img =>
          img
            .resize(3000, 4000, { fit: 'inside', withoutEnlargement: false })
            .greyscale()
            .normalize()
            .sharpen()
            .threshold(100),
      },
    ];

    for (const task of tasks) {
      const outPath = `${base}${task.suffix}.png`;
      try {
        await task.pipeline(sharp(inputPath)).png({ compressionLevel: 6 }).toFile(outPath);
        variants.push({ path: outPath, name: task.name });
      } catch (err) {
        this.logger.warn(`Variante ${task.name} échouée: ${err.message}`);
      }
    }

    return variants;
  }

  // ─── Nettoyage texte ──────────────────────────────────────────────────────

  private applyOCRCorrections(text: string): string {
    let corrected = text;
    for (const [pattern, replacement] of this.OCR_CORRECTIONS) {
      corrected = corrected.replace(pattern, replacement);
    }
    return corrected;
  }

  private cleanText(text: string): string {
    return this.applyOCRCorrections(text)
      .replace(/[^\w\s€.,:\-\/()%]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ─── Extraction prix ──────────────────────────────────────────────────────

  /** Extrait tous les montants présents sur une ligne */
  private extractPricesFromLine(line: string): number[] {
    const patterns = [
      /(\d{1,4})[,.](\d{2})\s*€?/g,
      /€\s*(\d{1,4})[,.](\d{2})/g,
    ];
    const prices: number[] = [];
    for (const pattern of patterns) {
      const fresh = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = fresh.exec(line)) !== null) {
        const price = parseFloat(`${match[1]}.${match[2]}`);
        if (price > 0.01 && price < 10000) {
          prices.push(price);
        }
      }
    }
    return prices;
  }

  // ─── Extraction TOTAL ─────────────────────────────────────────────────────

  /**
   * Cherche d'abord le prix sur/après une ligne contenant un mot-clé de total.
   * Fallback sur le prix maximum (comportement précédent).
   */
  private computeTotal(lines: string[]): { total: number | null; boost: number } {
    const totalKeyword =
      /(?:total|net\s*[àa]\s*payer|[àa]\s*payer|montant|solde|r[eé]gler|ttc|net\s*ttc|total\s*ttc|vous\s*devez)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!totalKeyword.test(line)) continue;

      // Prix sur la même ligne
      const same = this.extractPricesFromLine(line);
      if (same.length > 0) {
        const total = same[same.length - 1]; // Dernier prix de la ligne = montant TTC
        this.logger.log(`💰 Total trouvé (ligne mot-clé): ${total}€`);
        return { total, boost: 50 };
      }

      // Prix sur la ligne suivante (format 2 lignes)
      if (i + 1 < lines.length) {
        const next = this.extractPricesFromLine(lines[i + 1]);
        if (next.length > 0) {
          this.logger.log(`💰 Total trouvé (ligne suivante): ${next[0]}€`);
          return { total: next[0], boost: 40 };
        }
      }
    }

    // Fallback : prix le plus élevé
    const allPrices = lines.flatMap(l => this.extractPricesFromLine(l));
    if (allPrices.length > 0) {
      const total = Math.max(...allPrices);
      this.logger.log(`💰 Total fallback (max): ${total}€`);
      return { total, boost: 20 };
    }

    return { total: null, boost: 0 };
  }

  // ─── Extraction articles ──────────────────────────────────────────────────

  private extractArticles(text: string): Article[] {
    const articles: Article[] = [];
    const skipLine =
      /total|tva|t\.v\.a|sous[\s-]?total|avoir|remise|r[eé]duction|caution|consigne|acompte|net\s*[àa]|fidélit|fidelit/i;

    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (line.length < 3 || skipLine.test(line)) continue;

      // Ligne se terminant par un prix : "NOM ARTICLE   4,99"
      const match = line.match(/^(.+?)\s{2,}(\d{1,4}[,.]\d{2})\s*€?\s*$/);
      if (!match) continue;

      const name = match[1].trim().replace(/\s+/g, ' ');
      const price = parseFloat(match[2].replace(',', '.'));

      if (name.length < 2 || price <= 0.01 || price >= 1000) continue;

      // Détection quantité : "2x NOM" ou "NOM x2"
      const qtyPrefix = name.match(/^(\d+)\s*[xX×]\s*(.+)/);
      const qtySuffix = name.match(/^(.+?)\s+(\d+)\s*[xX×]\s*$/);

      if (qtyPrefix) {
        articles.push({ name: qtyPrefix[2].trim(), price, quantity: parseInt(qtyPrefix[1]) });
      } else if (qtySuffix) {
        articles.push({ name: qtySuffix[1].trim(), price, quantity: parseInt(qtySuffix[2]) });
      } else {
        articles.push({ name, price });
      }
    }

    return articles;
  }

  // ─── Extraction TVA ───────────────────────────────────────────────────────

  private extractTVA(text: string): number | null {
    // "TVA 20% 2,50" ou "TVA : 2,50"
    const patterns = [
      /t\.?v\.?a\.?\s+\d+(?:[,.]\d+)?\s*%?\s*[:\s]\s*(\d+[,.]\d{2})/i,
      /t\.?v\.?a\.?\s*[:\s]\s*(\d+[,.]\d{2})/i,
    ];
    for (const pat of patterns) {
      const match = pat.exec(text);
      if (match) {
        const tva = parseFloat(match[1].replace(',', '.'));
        if (tva > 0 && tva < 1000) return tva;
      }
    }
    return null;
  }

  // ─── Extraction enseigne ──────────────────────────────────────────────────

  private extractMerchant(text: string): string | null {
    // On cherche d'abord dans les 8 premières lignes (en-tête du ticket)
    const header = text.split('\n').slice(0, 8).join('\n').toUpperCase();
    const upper = text.toUpperCase();

    for (const store of this.STORE_NAMES) {
      if (header.includes(store)) return store;
    }
    for (const store of this.STORE_NAMES) {
      if (upper.includes(store)) return store;
    }

    // Heuristique : première ligne tout en majuscules (souvent le nom du magasin)
    const firstCapsLine = text
      .split('\n')
      .find(l => l.trim().length >= 4 && /^[A-Z\s&'.\-]{4,}$/.test(l.trim()));
    if (firstCapsLine) return firstCapsLine.trim();

    return null;
  }

  // ─── Extraction date ──────────────────────────────────────────────────────

  private extractDate(text: string): string | null {
    const patterns = [
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/,
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/,
    ];
    for (const pat of patterns) {
      const match = text.match(pat);
      if (!match) continue;
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      if (day < 1 || day > 31 || month < 1 || month > 12) continue;
      const year = match[3].length === 2 ? '20' + match[3] : match[3];
      return `${match[1]}/${match[2]}/${year}`;
    }
    return null;
  }

  // ─── Extraction complète ──────────────────────────────────────────────────

  private extractAllData(rawText: string): ExtractedData {
    const cleanedText = this.cleanText(rawText);
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let confidence = 0;

    const { total, boost: totalBoost } = this.computeTotal(lines);
    if (total !== null) confidence += totalBoost;

    const date = this.extractDate(rawText);
    if (date) confidence += 20;

    const merchant = this.extractMerchant(rawText);
    if (merchant) confidence += 25;

    const tva = this.extractTVA(rawText);
    if (tva !== null) confidence += 10;

    const articles = this.extractArticles(rawText);
    if (articles.length > 0) confidence += 15;

    // Bonus qualité texte
    if (rawText.length > 100) confidence += 5;
    if (cleanedText.length > 50) confidence += 5;
    if (/TOTAL/i.test(rawText)) confidence += 10;
    if (articles.length > 3) confidence += 5; // Ticket bien lisible

    this.logger.log(
      `📊 Extraction: total=${total}€, date=${date}, enseigne=${merchant}, TVA=${tva}€, articles=${articles.length}`,
    );

    return { total, date, merchant, tva, articles, confidence, cleanedText };
  }

  // ─── Google Vision OCR ────────────────────────────────────────────────────

  /**
   * OCR via Google Cloud Vision API (DOCUMENT_TEXT_DETECTION).
   * Bien supérieur à Tesseract sur les tickets de caisse.
   * Nécessite GOOGLE_VISION_API_KEY dans .env.
   * Gratuit : 1 000 requêtes/mois.
   */
  private runGoogleVisionOCR(
    imagePath: string,
  ): Promise<{ text: string; confidence: number }> {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY non configurée');

    const base64 = fs.readFileSync(imagePath).toString('base64');
    const body = JSON.stringify({
      requests: [
        {
          image: { content: base64 },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
        },
      ],
    });

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'vision.googleapis.com',
          path: `/v1/images:annotate?key=${apiKey}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        res => {
          let raw = '';
          res.on('data', chunk => (raw += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(raw);
              if (json.error) {
                reject(new Error(`Google Vision: ${json.error.message}`));
                return;
              }
              const annotation = json.responses?.[0]?.fullTextAnnotation;
              const text: string = annotation?.text ?? '';
              const pageConf: number = annotation?.pages?.[0]?.confidence ?? 0;
              resolve({ text, confidence: Math.round(pageConf * 100) });
            } catch (e) {
              reject(e);
            }
          });
        },
      );

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // ─── OCR Tesseract ────────────────────────────────────────────────────────

  /**
   * Lance l'OCR Tesseract sur une image via l'API shorthand (stable v6).
   */
  private async runOCR(
    imagePath: string,
    lang: string,
    label: string,
  ): Promise<{ text: string; tesseractConfidence: number }> {
    const { data } = await Tesseract.recognize(imagePath, lang, {
      logger: m => {
        if (m.status === 'recognizing text') {
          this.logger.log(`OCR [${label}]: ${Math.round((m.progress as number) * 100)}%`);
        }
      },
    });
    return { text: data.text, tesseractConfidence: data.confidence };
  }

  // ─── Point d'entrée public ────────────────────────────────────────────────

  async extractTotal(
    filePath: string,
    user: User,
  ): Promise<{
    success: boolean;
    text: string;
    message: string;
    extractedData?: any;
    ticketId?: number;
  }> {
    const tempFiles: string[] = [];

    try {
      this.logger.log(`🔍 Démarrage OCR: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error('Fichier introuvable');
      }

      // ── Validation + normalisation PNG (évite le crash Worker Tesseract) ─
      // Sharp valide le format ; si le fichier est HEIC/PDF/corrompu, il lève
      // une erreur ici — dans le try-catch principal — au lieu de tuer le process.
      let ocrInputPath = filePath;
      try {
        const meta = await sharp(filePath).metadata();
        this.logger.log(`📷 Format: ${meta.format} ${meta.width}x${meta.height}px`);
        // Convertit en PNG pour une compatibilité maximale avec Tesseract
        const pngPath = filePath.replace(/\.[^/.]+$/, '') + '_ocr.png';
        await sharp(filePath).png({ compressionLevel: 1 }).toFile(pngPath);
        ocrInputPath = pngPath;
        tempFiles.push(pngPath);
        this.logger.log(`🔄 Normalisé en PNG: ${pngPath}`);
      } catch (err) {
        throw new Error(
          `Format non supporté ou fichier corrompu: ${err.message}. Utilisez JPG ou PNG.`,
        );
      }

      // ── Étape 0 : Google Vision (si clé disponible) ────────────────────
      if (process.env.GOOGLE_VISION_API_KEY) {
        try {
          this.logger.log('🌐 Tentative Google Cloud Vision…');
          const { text } = await this.runGoogleVisionOCR(ocrInputPath);
          const extracted = this.extractAllData(text);
          this.logger.log(`📊 Google Vision: score=${extracted.confidence}%`);

          // Google Vision est fiable : on accepte dès qu'un montant est trouvé
          if (extracted.total !== null || extracted.confidence >= 30) {
            let success = true;
            let message: string;
            if (extracted.confidence >= 50) {
              message = `✅ Google Vision OCR réussi (${extracted.confidence}%)`;
            } else if (extracted.total !== null) {
              message = `🔍 Google Vision — montant détecté: ${extracted.total}€`;
            } else {
              message = `⚠️ Google Vision partiel (${extracted.confidence}%)`;
            }

            const ticket = this.ticketRepository.create({
              texte: extracted.cleanedText || '',
              user,
              dateAjout: new Date(),
              totalExtrait: extracted.total ?? undefined,
              dateTicket: extracted.date ?? undefined,
              commercant: extracted.merchant ?? undefined,
              tva: extracted.tva ?? undefined,
              confianceOCR: extracted.confidence,
              imagePath: filePath,
            });
            if (extracted.articles.length > 0) ticket.articles = extracted.articles;
            const saved = await this.ticketRepository.save(ticket);
            this.logger.log(`💾 Ticket #${saved.id} sauvegardé via Google Vision`);

            return {
              success,
              text: extracted.cleanedText,
              message,
              extractedData: {
                confidence: extracted.confidence,
                total: extracted.total,
                date: extracted.date,
                merchant: extracted.merchant,
                tva: extracted.tva,
                articles: extracted.articles,
              },
              ticketId: saved.id,
            };
          }
        } catch (err) {
          this.logger.warn(`⚠️ Google Vision échoué, fallback Tesseract: ${err.message}`);
        }
      }

      // ── Étape 1 : tests rapides sur l'image originale ──────────────────
      const GOOD_SCORE = 60;
      let bestResult: ExtractedData | null = null;
      let bestScore = 0;

      const quickTests = [
        { lang: 'fra', label: 'fra' },
        { lang: 'fra+eng', label: 'fra+eng' },
      ];

      for (const test of quickTests) {
        try {
          const { text } = await this.runOCR(ocrInputPath, test.lang, test.label);
          const extracted = this.extractAllData(text);

          this.logger.log(`📊 Test ${test.label}: score=${extracted.confidence}%`);

          if (extracted.confidence > bestScore) {
            bestScore = extracted.confidence;
            bestResult = extracted;
          }

          if (bestScore >= GOOD_SCORE) {
            this.logger.log(`✅ Early exit (${bestScore}% ≥ ${GOOD_SCORE}%)`);
            break;
          }
        } catch (err) {
          this.logger.warn(`❌ Test ${test.label}: ${err.message}`);
        }
      }

      // ── Étape 2 : variantes prétraitées si score insuffisant ───────────
      if (bestScore < GOOD_SCORE) {
        this.logger.log(`⚡ Score faible (${bestScore}%), création des variantes…`);
        const variants = await this.createPreprocessedVariants(ocrInputPath);
        tempFiles.push(...variants.map(v => v.path));

        for (const variant of variants) {
          try {
            const { text } = await this.runOCR(variant.path, 'fra', variant.name);
            const extracted = this.extractAllData(text);

            this.logger.log(`📊 Variante ${variant.name}: score=${extracted.confidence}%`);

            if (extracted.confidence > bestScore) {
              bestScore = extracted.confidence;
              bestResult = extracted;
            }

            if (bestScore >= GOOD_SCORE) {
              this.logger.log(`✅ Early exit variante (${bestScore}%)`);
              break;
            }
          } catch (err) {
            this.logger.warn(`❌ Variante ${variant.name}: ${err.message}`);
          }
        }
      }

      if (!bestResult) {
        throw new Error("Aucune reconnaissance OCR n'a abouti");
      }

      this.logger.log(`🏆 Meilleur score final: ${bestScore}%`);

      // ── Résultat & message ─────────────────────────────────────────────
      let success: boolean;
      let message: string;

      if (bestScore >= 50) {
        success = true;
        message = `✅ OCR réussi (${bestScore}%)`;
      } else if (bestScore >= 25) {
        success = true;
        message = `⚠️ OCR partiel (${bestScore}%) — données incomplètes`;
      } else if (bestResult.total !== null) {
        success = true;
        message = `🔍 OCR difficile — montant détecté: ${bestResult.total}€`;
      } else {
        success = false;
        message = `❌ Qualité insuffisante (${bestScore}%). Réessayez avec une photo plus nette.`;
      }

      // ── Sauvegarde ──────────────────────────────────────────────────────
      let savedTicket: Ticket | null = null;
      if (success) {
        const ticket = this.ticketRepository.create({
          texte: bestResult.cleanedText || '',
          user,
          dateAjout: new Date(),
          totalExtrait: bestResult.total ?? undefined,
          dateTicket: bestResult.date ?? undefined,
          commercant: bestResult.merchant ?? undefined,
          tva: bestResult.tva ?? undefined,
          confianceOCR: bestScore,
          imagePath: filePath,
        });

        // Sauvegarder les articles via le setter de l'entité
        if (bestResult.articles.length > 0) {
          ticket.articles = bestResult.articles;
        }

        savedTicket = await this.ticketRepository.save(ticket);
        this.logger.log(`💾 Ticket #${savedTicket.id} sauvegardé`);
      }

      return {
        success,
        text: bestResult.cleanedText,
        message,
        extractedData: {
          confidence: bestScore,
          total: bestResult.total,
          date: bestResult.date,
          merchant: bestResult.merchant,
          tva: bestResult.tva,
          articles: bestResult.articles,
        },
        ticketId: savedTicket?.id,
      };

    } catch (error) {
      this.logger.error('💥 Erreur OCR:', error);
      return {
        success: false,
        text: '',
        message: `Erreur: ${error.message}`,
      };
    } finally {
      // Nettoyage des fichiers temporaires
      for (const file of tempFiles) {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch {
            this.logger.warn(`Impossible de supprimer ${file}`);
          }
        }
      }
    }
  }

  async deleteTicket(id: number, user: User): Promise<void> {
    const ticket = await this.ticketRepository.findOne({ where: { id, user } });
    if (!ticket) {
      throw new NotFoundException('Ticket non trouvé ou non autorisé.');
    }
    await this.ticketRepository.remove(ticket);
  }
}
