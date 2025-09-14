import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as sharp from 'sharp';
import * as fs from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entity/ticket.entity';
import { User } from '../entity/user.entity';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * Créer une seule variante optimisée rapidement
   */
  private async createOptimizedImage(inputPath: string): Promise<string> {
    try {
      const optimized = inputPath.replace(/\.(jpg|jpeg|png)$/i, '_opt.png');
      await sharp(inputPath)
        .resize(2000, 2000, { fit: 'inside', withoutEnlargement: false })
        .greyscale()
        .normalize()
        .sharpen()
        .threshold(120)
        .png({ quality: 90, compressionLevel: 6 })
        .toFile(optimized);

      this.logger.log(`Image optimisée créée: ${optimized}`);
      return optimized;

    } catch (error) {
      this.logger.error('Erreur création image optimisée:', error);
      return inputPath;
    }
  }

  /**
   * Nettoyage ultra-agressif du texte OCR corrompu
   */
  private cleanCorruptedText(text: string): string {
    let cleaned = text;

    // 1. Supprimer les mots complètement corrompus de votre exemple
    const garbageWords = [
      'Tee', '4e', 'Tu', 'DS', 'AE', 'SR', 'Sow', 'T4', 'Ou', 'alt', 'ET', 'OC', 'TR', 'eet',
      'C8', 'SECS', 'Lan', 'Pere', 'dert', 'Fa', 'QURLY', 'Ee', 'LIOR', 'Tame', 'bm', 'os',
      'nl', 'LESC', 'TE', 'Le', 'LIRR', 'DZ', 'Ut', 'OUT', 'VE', 'ZA', 'run', 'Sas',
      'TT', 'LS', 'ad', 'ss', 'ns', 'LODEL', 'CS', 'ETL', 'TP', 'Severs', 'CN', 'he',
      'HT', 'LILT', 'ROULE', 'RES'
    ];

    // Supprimer tous les mots poubelle
    garbageWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      cleaned = cleaned.replace(regex, ' ');
    });

    // 2. Corrections de mots reconnaissables
    const corrections = [
      ['T0TAL', 'TOTAL'],
      ['TUTAL', 'TOTAL'],
      ['OTAL', 'TOTAL'],
      ['c LIRR', 'TOTAL'],
      ['[OTAL', 'TOTAL'],
      ['LUR', 'EUR'],
      ['LIRR', 'EUR'],
    ];

    corrections.forEach(([wrong, correct]) => {
      const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleaned = cleaned.replace(regex, correct);
    });

    // 3. Nettoyer et normaliser
    cleaned = cleaned
      .replace(/[^\w\s€.,:\-]/g, ' ') // Caractères bizarres
      .replace(/\s+/g, ' ') // Espaces multiples
      .replace(/\b\w{1,2}\b/g, '') // Mots trop courts (souvent du bruit)
      .trim();

    return cleaned;
  }

  /**
   * Extraire les données même d'un texte très abîmé
   */
  private extractFromDamagedText(originalText: string, cleanedText: string): any {
    const result: any = { confidence: 0 };

    // Chercher dans le texte original ET nettoyé
    const textsToAnalyze = [originalText, cleanedText];

    // 1. Recherche de prix/montants
    const pricePatterns = [
      /(\d+)[,.](\d{1,2})/g, // 1,07 ou 15.50
      /(\d{1,3})\s*[,.:]\s*(\d{2})/g, // 15 : 50
      /(\d+)\s*€/g, // 15€
      /€\s*(\d+)/g, // €15
    ];

    const foundPrices = [];

    textsToAnalyze.forEach(text => {
      pricePatterns.forEach(pattern => {
        let match;
        // Reset du pattern pour chaque utilisation
        const freshPattern = new RegExp(pattern.source, pattern.flags);
        while ((match = freshPattern.exec(text)) !== null) {
          let price;
          if (match[2]) {
            // Format avec décimales
            price = parseFloat(match[1] + '.' + match[2]);
          } else {
            // Format simple
            price = parseFloat(match[1]);
          }

          // Filtrer les prix aberrants
          if (price > 0 && price < 10000) {
            foundPrices.push(price);
          }
        }
      });
    });

    if (foundPrices.length > 0) {
      // Prendre le prix le plus élevé (probablement le total)
      result.total = Math.max(...foundPrices);
      result.confidence += 40;
      this.logger.log(`Prix détectés: [${foundPrices.join(', ')}] → Retenu: ${result.total}€`);
    }

    // 2. Recherche de date
    const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
    for (const text of textsToAnalyze) {
      const dateMatch = text.match(datePattern);
      if (dateMatch) {
        result.date = dateMatch[0];
        result.confidence += 20;
        break;
      }
    }

    // 3. Recherche de magasin
    const storeNames = [
      'CARREFOUR', 'LECLERC', 'AUCHAN', 'MONOPRIX', 'FRANPRIX',
      'INTERMARCHE', 'LIDL', 'ALDI', 'CASINO', 'CORA', 'SIMPLY'
    ];

    for (const text of textsToAnalyze) {
      const upperText = text.toUpperCase();
      for (const store of storeNames) {
        if (upperText.includes(store)) {
          result.merchant = store;
          result.confidence += 25;
          break;
        }
      }
      if (result.merchant) break;
    }

    // 4. Bonus si on trouve "TOTAL" quelque part
    for (const text of textsToAnalyze) {
      if (/TOTAL/i.test(text)) {
        result.confidence += 15;
        break;
      }
    }

    return result;
  }

  /**
   * OCR rapide et efficace avec early exit
   */
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
      this.logger.log(`🔍 Analyse OCR rapide: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        throw new Error('Fichier non trouvé');
      }

      // Priorité des tests (du plus rapide au plus lent)
      const testCases = [
        { image: filePath, lang: 'fra' }, // 1. Image originale + français
        { image: filePath, lang: 'fra+eng' }, // 2. Image originale + multi-langue
      ];

      let bestResult = null;
      let bestScore = 0;
      const GOOD_SCORE_THRESHOLD = 60; // Score suffisant pour early exit

      // Test rapide avec image originale
      for (const [index, testCase] of testCases.entries()) {
        try {
          this.logger.log(`📸 Test rapide ${index + 1}: ${testCase.lang}`);

          const { data } = await Tesseract.recognize(testCase.image, testCase.lang, {
            logger: m => {
              if (m.status === 'recognizing text') {
                this.logger.log(`OCR ${index + 1}: ${Math.round(m.progress * 100)}%`);
              }
            }
          });

          const originalText = data.text;
          const cleanedText = this.cleanCorruptedText(originalText);
          const extractedData = this.extractFromDamagedText(originalText, cleanedText);

          let score = extractedData.confidence;
          if (originalText.length > 10) score += 5;
          if (cleanedText.length > 5) score += 5;

          this.logger.log(`📊 Test ${index + 1}: Score=${score}%, Total=${extractedData.total || 'N/A'}€`);

          if (score > bestScore) {
            bestScore = score;
            bestResult = {
              originalText,
              cleanedText,
              extractedData,
              confidence: score,
              testCase: index + 1,
              language: testCase.lang
            };
          }

          // Early exit si score suffisant
          if (score >= GOOD_SCORE_THRESHOLD) {
            this.logger.log(`✅ Score suffisant atteint (${score}%), arrêt anticipé`);
            break;
          }

        } catch (error) {
          this.logger.warn(`❌ Test ${index + 1}: ${error.message}`);
        }
      }

      // Si pas de bon résultat, essayer avec image optimisée
      if (bestScore < GOOD_SCORE_THRESHOLD) {
        this.logger.log(`⚡ Score faible (${bestScore}%), tentative avec image optimisée`);

        const optimizedImage = await this.createOptimizedImage(filePath);
        tempFiles.push(optimizedImage);

        try {
          const { data } = await Tesseract.recognize(optimizedImage, 'fra', {
            logger: m => {
              if (m.status === 'recognizing text') {
                this.logger.log(`OCR optimisé: ${Math.round(m.progress * 100)}%`);
              }
            }
          });

          const originalText = data.text;
          const cleanedText = this.cleanCorruptedText(originalText);
          const extractedData = this.extractFromDamagedText(originalText, cleanedText);

          let score = extractedData.confidence;
          if (originalText.length > 10) score += 5;
          if (cleanedText.length > 5) score += 5;

          this.logger.log(`📊 Optimisé: Score=${score}%, Total=${extractedData.total || 'N/A'}€`);

          if (score > bestScore) {
            bestScore = score;
            bestResult = {
              originalText,
              cleanedText,
              extractedData,
              confidence: score,
              testCase: 'optimisé',
              language: 'fra'
            };
          }

        } catch (error) {
          this.logger.warn(`❌ OCR optimisé: ${error.message}`);
        }
      }

      // Résultats
      if (!bestResult) {
        throw new Error('Aucune reconnaissance OCR n\'a fonctionné');
      }

      this.logger.log(`🏆 Meilleur: ${bestResult.testCase}-${bestResult.language} (${bestScore}%)`);

      // Messages selon la qualité
      let message = '';
      let success = false;

      if (bestScore >= 50) {
        message = `✅ OCR réussi avec bonne qualité (${bestScore}%)`;
        success = true;
      } else if (bestScore >= 25) {
        message = `⚠️ OCR partiellement réussi (${bestScore}%). Données partielles extraites.`;
        success = true;
      } else if (bestResult.extractedData.total) {
        message = `🔍 OCR difficile mais montant détecté: ${bestResult.extractedData.total}€`;
        success = true;
      } else {
        message = `❌ Image de très mauvaise qualité (${bestScore}%). Essayez une photo plus nette.`;
        success = false;
      }

      // Sauvegarder même les résultats partiels
      let savedTicket = null;
      if (success) {
        const ticket = this.ticketRepository.create({
          texte: bestResult.cleanedText || bestResult.originalText,
          user,
          dateAjout: new Date(),
          totalExtrait: bestResult.extractedData.total || null,
          dateTicket: bestResult.extractedData.date || null,
          commercant: bestResult.extractedData.merchant || null,
          imagePath: filePath, // Sauvegarder le chemin de l'image
        });
        savedTicket = await this.ticketRepository.save(ticket);
      }

      return {
        success,
        text: bestResult.cleanedText || bestResult.originalText,
        message,
        extractedData: bestResult.extractedData,
        ticketId: savedTicket?.id,
      };

    } catch (error) {
      this.logger.error('💥 Erreur OCR robuste:', error);
      return {
        success: false,
        text: '',
        message: `Erreur: ${error.message}`,
      };
    } finally {
      // Nettoyage
      tempFiles.forEach(file => {
        if (fs.existsSync(file)) {
          try {
            fs.unlinkSync(file);
          } catch (error) {
            this.logger.warn(`Impossible de supprimer ${file}`);
          }
        }
      });
    }
  }

  async deleteTicket(id: number, user: User): Promise<void> {
    const ticket = await this.ticketRepository.findOne({
      where: { id, user },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket non trouvé ou non autorisé.');
    }

    await this.ticketRepository.remove(ticket);
  }
}