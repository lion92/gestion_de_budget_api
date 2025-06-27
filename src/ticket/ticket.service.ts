import { Injectable, NotFoundException } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as fs from 'fs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../entity/ticket.entity';
import { User } from '../entity/user.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async extractTotal(
    filePath: string,
    user: User,
  ): Promise<{
    success: boolean;
    text: string;
    message: string;
  }> {
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(filePath, 'fra');

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // supprimer le fichier après traitement
      }

      const ticket = this.ticketRepository.create({
        texte: text,
        user,
        dateAjout: new Date(),
      });
      await this.ticketRepository.save(ticket);

      return {
        success: true,
        text,
        message: 'Ticket bien analysé et enregistré.',
      };
    } catch (err) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return {
        success: false,
        text: '',
        message: 'Erreur OCR : ' + err.message,
      };
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
