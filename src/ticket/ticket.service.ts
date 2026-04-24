import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entity/ticket.entity';
import { TicketExpense } from '../entity/ticket-expense.entity';
import { Action } from '../entity/action.entity';
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
    // ── TOTAL et variantes ────────────────────────────────────────────────
    [/\bT[O0]TAL\b/gi, 'TOTAL'],
    [/\bTUTAL\b/gi, 'TOTAL'],
    [/\bT[O0]TAI\b/gi, 'TOTAL'],
    [/\bT\s?[O0]\s?T\s?A\s?L\b/gi, 'TOTAL'],
    [/\[\s*OTAL\b/gi, 'TOTAL'],
    [/\(\s*OTAL\b/gi, 'TOTAL'],
    [/\bTOTRL\b/gi, 'TOTAL'],
    [/\bT0TAI\b/gi, 'TOTAL'],
    // ── MONTANT ──────────────────────────────────────────────────────────
    [/\bM[O0]NTANT\b/gi, 'MONTANT'],
    [/\bMONT\s?ANT\b/gi, 'MONTANT'],
    [/\bMNONTANT\b/gi, 'MONTANT'],
    // ── PAYER / PAIEMENT ─────────────────────────────────────────────────
    [/\bPA¥ER\b/gi, 'PAYER'],
    [/\bPAYEl\b/gi, 'PAYER'],
    [/\bPAYEF\b/gi, 'PAYER'],
    [/\bPAIEM[EE]NT\b/gi, 'PAIEMENT'],
    // ── NET ──────────────────────────────────────────────────────────────
    [/\bNEr\b/gi, 'NET'],
    [/\bN[EE]T\b/g, 'NET'],
    // ── EUR / € ──────────────────────────────────────────────────────────
    [/\bLUR\b/gi, 'EUR'],
    [/\bLIRR\b/gi, 'EUR'],
    [/\bEUR[O0]\b/gi, 'EURO'],
    [/\bEUF\b/gi, 'EUR'],
    // ── TVA ──────────────────────────────────────────────────────────────
    [/\bTVfl\b/gi, 'TVA'],
    [/\bTVf\b/gi, 'TVA'],
    [/\bT\.V\.A\.?\b/gi, 'TVA'],
    [/\bTV4\b/gi, 'TVA'],
    // ── ESPECES / CB ─────────────────────────────────────────────────────
    [/\bESP[EÈ]CES?\b/gi, 'ESPECES'],
    [/\bESPECES\b/gi, 'ESPECES'],
    // ── Confusions chiffres dans contexte de prix ─────────────────────────
    // O/0 et I/l/1 entre deux chiffres
    [/(\d)[Ol](\d)/g, '$10$2'],
    [/(\d)[Il](\d)/g, '$11$2'],
    // S→5, B→8, G→6 en contexte numérique (chiffre avant)
    [/(\d)S(\d)/g, '$15$2'],
    [/(\d)B(\d)/g, '$18$2'],
    // Virgule/point OCR : parfois un espace est inséré "12 50" → garder pour extractPrices
  ];

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketExpense)
    private readonly ticketExpenseRepository: Repository<TicketExpense>,
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
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
    const seen = new Set<number>();
    const add = (p: number) => {
      if (p > 0.01 && p < 10000 && !seen.has(p)) {
        seen.add(p);
      }
    };

    // Pattern 1 : 12,50 ou 12.50 (2 décimales) optionnellement suivi de €
    const p1 = /(\d{1,4})[,.](\d{2})(?:\s*[€E])?/g;
    let m: RegExpExecArray | null;
    while ((m = p1.exec(line)) !== null) add(parseFloat(`${m[1]}.${m[2]}`));

    // Pattern 2 : € devant le nombre  →  €12,50
    const p2 = /[€E]\s*(\d{1,4})[,.](\d{2})/g;
    while ((m = p2.exec(line)) !== null) add(parseFloat(`${m[1]}.${m[2]}`));

    // Pattern 3 : 1 seule décimale  →  12,5  (OCR qui coupe la 2e)
    const p3 = /(\d{1,4})[,.](\d{1})(?!\d)/g;
    while ((m = p3.exec(line)) !== null) add(parseFloat(`${m[1]}.${m[2]}0`));

    // Pattern 4 : espace comme séparateur décimal → "12 50 €" ou "12 50€"
    // Limité au contexte € pour éviter les faux positifs
    const p4 = /(\d{1,4})\s(\d{2})\s*€/g;
    while ((m = p4.exec(line)) !== null) add(parseFloat(`${m[1]}.${m[2]}`));

    // Pattern 5 : nombre entier suivi de € (ex: "15 €", "15€")
    const p5 = /\b(\d{1,4})\s*[€E]\b/g;
    while ((m = p5.exec(line)) !== null) add(parseFloat(`${m[1]}.00`));

    return Array.from(seen);
  }

  // ─── Extraction TOTAL ─────────────────────────────────────────────────────

  private computeTotal(lines: string[]): { total: number | null; boost: number } {
    // Priorité 1 – mots-clés à haute certitude (montant final payé)
    const strongKw = /(?:net\s*[àa]\s*payer|[àa]\s*payer|vous\s*devez|montant\s*(?:total|ttc|net|pay[eé]|d[uû])|total\s*ttc|votre\s*total|net\s*(?:ttc|encaiss[eé])|solde\s*[àa]\s*payer)/i;

    // Priorité 2 – mots-clés génériques (peut être sous-total aussi)
    const weakKw = /(?:\btotal\b|\bmontant\b|\bsolde\b|r[eé]gler|encaiss[eé]|r[eè]glement|paiement)/i;

    // Priorité 3 – lignes de moyen de paiement : montant exact payé
    const paymentKw = /(?:\bcb\b|carte\s*(?:bleue|bancaire|visa|master(?:card)?|credit)?|esp[eè]ces?|ch[eè]que|paypal|lydia|virement)/i;

    // Cherche le prix MAX dans une fenêtre de lignes (le TTC est toujours le plus grand)
    const maxInWindow = (from: number, size = 3): number | null => {
      const prices = lines
        .slice(from, Math.min(from + size, lines.length))
        .flatMap(l => this.extractPricesFromLine(l));
      return prices.length > 0 ? Math.max(...prices) : null;
    };

    // Passe 1 : mots-clés forts
    for (let i = 0; i < lines.length; i++) {
      if (!strongKw.test(lines[i])) continue;
      const total = maxInWindow(i);
      if (total !== null) {
        this.logger.log(`💰 Total fort [${lines[i].trim()}]: ${total}€`);
        return { total, boost: 55 };
      }
    }

    // Passe 2 : mots-clés faibles
    for (let i = 0; i < lines.length; i++) {
      if (!weakKw.test(lines[i])) continue;
      const total = maxInWindow(i);
      if (total !== null) {
        this.logger.log(`💰 Total faible [${lines[i].trim()}]: ${total}€`);
        return { total, boost: 45 };
      }
    }

    // Passe 3 : lignes de paiement (CB, espèces…)
    for (let i = 0; i < lines.length; i++) {
      if (!paymentKw.test(lines[i])) continue;
      const total = maxInWindow(i, 2);
      if (total !== null) {
        this.logger.log(`💰 Total paiement [${lines[i].trim()}]: ${total}€`);
        return { total, boost: 40 };
      }
    }

    // Passe 4 : dernier grand montant dans la moitié basse du ticket
    // (les totaux sont toujours en bas)
    const half = Math.floor(lines.length / 2);
    const bottomPrices = lines.slice(half).flatMap(l => this.extractPricesFromLine(l));
    if (bottomPrices.length > 0) {
      const total = Math.max(...bottomPrices);
      this.logger.log(`💰 Total bas-ticket (fallback): ${total}€`);
      return { total, boost: 25 };
    }

    // Passe 5 : max global en dernier recours
    const allPrices = lines.flatMap(l => this.extractPricesFromLine(l));
    if (allPrices.length > 0) {
      const total = Math.max(...allPrices);
      this.logger.log(`💰 Total max global (dernier recours): ${total}€`);
      return { total, boost: 15 };
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

    const { total, boost: totalBoost } = this.computeTotal(lines);
    const date    = this.extractDate(rawText);
    const merchant = this.extractMerchant(rawText);
    const tva     = this.extractTVA(rawText);
    const articles = this.extractArticles(rawText);

    // ── 1. Total détecté : 0–38 pts selon la fiabilité de la source ──────
    // boost 55 = mot-clé fort | 45 = mot-clé faible | 40 = paiement CB
    // 25 = bas ticket | 15 = max global
    let score = 0;
    const totalScore =
      totalBoost >= 50 ? 38 :
      totalBoost >= 40 ? 30 :
      totalBoost >= 30 ? 22 :
      totalBoost  >  0 ? 12 : 0;
    score += totalScore;

    // ── 2. Date valide : 0–12 pts ─────────────────────────────────────────
    if (date) score += 12;

    // ── 3. Enseigne : 0–12 pts (connue = 12, heuristique = 6) ────────────
    if (merchant) {
      const isKnown = this.STORE_NAMES.some(s => merchant.toUpperCase().includes(s));
      score += isKnown ? 12 : 6;
    }

    // ── 4. Cohérence interne : 0–26 pts ──────────────────────────────────
    if (total !== null && total >= 0.5 && total <= 5000) {
      score += 3; // total dans une plage réaliste

      // TVA cohérente : ~5 % (alimentaire) à ~25 % du total hors taxe
      if (tva !== null && tva > total * 0.03 && tva < total * 0.28) score += 6;

      // Somme des articles ≈ total
      if (articles.length > 0) {
        const sum = articles.reduce((acc, a) => acc + a.price * (a.quantity ?? 1), 0);
        const ratio = sum / total;
        if (ratio >= 0.80 && ratio <= 1.20) score += 12; // ±20 % → très cohérent
        else if (ratio >= 0.60 && ratio <= 1.50) score += 6; // ±40-50 % → acceptable

        // Total ≥ max article (cohérence basique)
        const maxArticle = Math.max(...articles.map(a => a.price));
        if (total >= maxArticle) score += 5;
      }
    }

    // ── 5. Richesse du ticket : 0–8 pts ──────────────────────────────────
    if (articles.length >= 1) score += 2;
    if (articles.length >= 4) score += 3;
    if (articles.length >= 8) score += 3;

    // ── 6. Qualité OCR du texte brut : 0–4 pts ───────────────────────────
    // Ratio de caractères alphanumériques/ponctuation sur longueur totale
    const printable = (rawText.match(/[\w€.,:\-\/()%]/g) ?? []).length;
    const ocrQuality = rawText.length > 0 ? printable / rawText.length : 0;
    if (ocrQuality > 0.75) score += 4;
    else if (ocrQuality > 0.55) score += 2;

    const confidence = Math.min(100, Math.round(score));

    this.logger.log(
      `📊 Score: ${confidence}% | total=${total}€(+${totalScore}) date=${date}(+${date ? 12 : 0}) enseigne=${merchant} tva=${tva}€ articles=${articles.length} ocrQ=${Math.round(ocrQuality * 100)}%`,
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

  // ─── Ollama LLM structuration ─────────────────────────────────────────────

  /**
   * Envoie le texte brut OCR à Qwen via Ollama pour extraction structurée JSON.
   * Retourne null si Ollama n'est pas disponible ou timeout.
   */
  private async runOllamaLLM(rawOcrText: string): Promise<{
    total: number | null;
    date: string | null;
    merchant: string | null;
    tva: number | null;
    articles: Article[];
  } | null> {
    const ollamaHost = process.env.OLLAMA_HOST || 'localhost';
    const ollamaPort = parseInt(process.env.OLLAMA_PORT || '11434');
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

    const prompt = `Tu es un expert en analyse de tickets de caisse français. Le texte ci-dessous est extrait par OCR et peut contenir des erreurs (lettres/chiffres confondus, espaces parasites).

TEXTE OCR :
---
${rawOcrText.slice(0, 3000)}
---

Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans commentaire) :
{
  "total": <nombre décimal ou null>,
  "date": <"DD/MM/YYYY" ou null>,
  "merchant": <chaîne ou null>,
  "tva": <nombre décimal ou null>,
  "articles": [{"name": "...", "price": 0.00, "quantity": 1}]
}

RÈGLES STRICTES pour "total" (priorité décroissante) :
1. Cherche "NET A PAYER", "MONTANT TTC", "TOTAL TTC", "VOUS DEVEZ", "A PAYER" → c'est le montant juste après
2. Sinon cherche "TOTAL" seul → montant sur la même ligne ou la ligne suivante
3. Sinon cherche la ligne CB/CARTE/ESPECES → montant associé (c'est ce qui a été encaissé)
4. Ne jamais retourner un sous-total, une TVA ou le prix d'un article comme total
5. Le total est TOUJOURS >= à tout article individuel
6. Si plusieurs candidats, prendre le plus grand qui est cohérent avec la somme des articles
- articles = produits uniquement (max 20), exclure TVA/remises/totaux
- Si valeur absente ou impossible à déterminer avec certitude → null`;

    const body = JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0, num_predict: 800 },
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.warn('⏱ Ollama timeout (15s)');
        resolve(null);
      }, 15000);

      const req = http.request(
        { hostname: ollamaHost, port: ollamaPort, path: '/api/generate', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
        (res) => {
          let raw = '';
          res.on('data', chunk => (raw += chunk));
          res.on('end', () => {
            clearTimeout(timeout);
            try {
              const json = JSON.parse(raw);
              const responseText: string = json.response || '';
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              if (!jsonMatch) { resolve(null); return; }
              const parsed = JSON.parse(jsonMatch[0]);
              resolve({
                total: typeof parsed.total === 'number' ? parsed.total : null,
                date: typeof parsed.date === 'string' ? parsed.date : null,
                merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
                tva: typeof parsed.tva === 'number' ? parsed.tva : null,
                articles: Array.isArray(parsed.articles) ? parsed.articles.slice(0, 20) : [],
              });
            } catch (e) {
              this.logger.warn(`Ollama JSON parse error: ${e.message}`);
              resolve(null);
            }
          });
        },
      );
      req.on('error', (e) => { clearTimeout(timeout); this.logger.warn(`Ollama error: ${e.message}`); resolve(null); });
      req.write(body);
      req.end();
    });
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

      this.logger.log(`🏆 Meilleur score Tesseract final: ${bestScore}%`);

      // ── Étape 3 : enrichissement via Ollama LLM ────────────────────────
      this.logger.log('🤖 Envoi du texte OCR à Ollama pour structuration…');
      const ollamaResult = await this.runOllamaLLM(bestResult.cleanedText || '');

      let finalTotal    = bestResult.total;
      let finalDate     = bestResult.date;
      let finalMerchant = bestResult.merchant;
      let finalTva      = bestResult.tva;
      let finalArticles = bestResult.articles;
      let ocrSource     = 'tesseract';

      if (ollamaResult) {
        this.logger.log(`✅ Ollama: total=${ollamaResult.total}€, enseigne=${ollamaResult.merchant}, articles=${ollamaResult.articles.length}`);
        // Ollama prime sur Tesseract pour total et articles (plus fiable)
        if (ollamaResult.total !== null) finalTotal = ollamaResult.total;
        if (ollamaResult.date)           finalDate = ollamaResult.date;
        if (ollamaResult.merchant)       finalMerchant = ollamaResult.merchant;
        if (ollamaResult.tva !== null)   finalTva = ollamaResult.tva;
        if (ollamaResult.articles.length > 0) finalArticles = ollamaResult.articles;
        ocrSource = 'tesseract+ollama';
        if (finalTotal !== null) bestScore = Math.max(bestScore, 75);
      } else {
        this.logger.warn('⚠️ Ollama indisponible, utilisation du résultat Tesseract seul');
      }

      // ── Résultat & message ─────────────────────────────────────────────
      let success: boolean;
      let message: string;

      if (bestScore >= 50) {
        success = true;
        message = `✅ OCR réussi via ${ocrSource} (${bestScore}%)`;
      } else if (bestScore >= 25) {
        success = true;
        message = `⚠️ OCR partiel via ${ocrSource} (${bestScore}%) — données incomplètes`;
      } else if (finalTotal !== null) {
        success = true;
        message = `🔍 OCR difficile — montant détecté: ${finalTotal}€`;
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
          totalExtrait: finalTotal ?? undefined,
          dateTicket: finalDate ?? undefined,
          commercant: finalMerchant ?? undefined,
          tva: finalTva ?? undefined,
          confianceOCR: bestScore,
          imagePath: filePath,
        });

        if (finalArticles.length > 0) {
          ticket.articles = finalArticles;
        }

        savedTicket = await this.ticketRepository.save(ticket);
        this.logger.log(`💾 Ticket #${savedTicket.id} sauvegardé (${ocrSource})`);
      }

      return {
        success,
        text: bestResult.cleanedText,
        message,
        extractedData: {
          confidence: bestScore,
          total: finalTotal,
          date: finalDate,
          merchant: finalMerchant,
          tva: finalTva,
          articles: finalArticles,
          source: ocrSource,
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

  // ─── Liaison ticket ↔ dépense ─────────────────────────────────────────────

  async linkTicketToExpense(
    ticketId: number,
    expenseId: number,
    extractedData: Record<string, any>,
    user: User,
  ): Promise<TicketExpense> {
    const expense = await this.actionRepository.findOne({
      where: { id: expenseId },
      relations: ['user'],
    });

    if (!expense) throw new NotFoundException('Dépense introuvable');
    if (expense.user.id !== user.id) throw new ForbiddenException('Dépense non autorisée');

    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket introuvable');

    // UPSERT : on écrase si la dépense avait déjà un ticket lié
    const existing = await this.ticketExpenseRepository.findOne({
      where: { expense: { id: expenseId } },
    });

    const link = existing ?? this.ticketExpenseRepository.create();
    link.ticketId = ticketId;
    link.expense = expense;
    link.user = user;
    link.extractedData = extractedData;

    return this.ticketExpenseRepository.save(link);
  }

  async getTicketByExpense(expenseId: number, user: User): Promise<{
    ticketId: number;
    fileName: string;
    fileUrl: string;
    extractedData: Record<string, any>;
  }> {
    const link = await this.ticketExpenseRepository.findOne({
      where: { expense: { id: expenseId }, user: { id: user.id } },
    });

    if (!link) throw new NotFoundException('Aucun ticket lié à cette dépense');

    const ticket = await this.ticketRepository.findOne({ where: { id: link.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket introuvable');

    const fileName = ticket.imagePath ? ticket.imagePath.split('/').pop() : '';
    const baseUrl = process.env.BASE_URL || 'https://www.krisscode.fr/budget-api';
    const fileUrl = `${baseUrl}/ticket/image/${ticket.id}`;

    return {
      ticketId: ticket.id,
      fileName,
      fileUrl,
      extractedData: link.extractedData ?? {},
    };
  }

  async deleteLinkByExpense(expenseId: number, user: User): Promise<void> {
    const link = await this.ticketExpenseRepository.findOne({
      where: { expense: { id: expenseId }, user: { id: user.id } },
    });

    if (!link) throw new NotFoundException('Aucun lien ticket-dépense trouvé');
    await this.ticketExpenseRepository.remove(link);
  }

  async deleteTicket(id: number, user: User): Promise<void> {
    const ticket = await this.ticketRepository.findOne({ where: { id, user } });
    if (!ticket) {
      throw new NotFoundException('Ticket non trouvé ou non autorisé.');
    }
    await this.ticketRepository.remove(ticket);
  }
}
