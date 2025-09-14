import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Get,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { TicketService } from './ticket.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Ticket } from '../entity/ticket.entity';
import { v4 as uuidv4 } from 'uuid';

const uploadPath = join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

@Controller('ticket')
export class TicketController {
  private readonly logger = new Logger(TicketController.name);

  constructor(
    private readonly ticketService: TicketService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  /**
   * Upload et analyse d'un ticket avec OCR
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, cb) => {
          // Utiliser UUID pour éviter les conflits de noms
          const uniqueName = `ticket-${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'application/pdf'
        ];

        const ext = extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype;

        if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(mimeType)) {
          return cb(
            new BadRequestException(
              'Format de fichier non supporté. Utilisez: JPG, JPEG, PNG ou PDF'
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 Mo
        files: 1, // Un seul fichier
      },
    }),
  )
  async uploadTicket(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { jwt: string },
  ) {
    const startTime = Date.now();

    try {
      // Validation du fichier
      if (!file) {
        throw new BadRequestException('Aucun fichier fourni');
      }

      if (!body.jwt) {
        throw new BadRequestException('Token JWT requis');
      }

      // Vérification JWT
      const data = await this.jwtService.verifyAsync(body.jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      // Récupération de l'utilisateur
      const user = await this.userRepository.findOne({
        where: { id: data.id },
      });

      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }

      this.logger.log(`Début analyse OCR - Fichier: ${file.filename}, Utilisateur: ${user.id}`);

      // Validation supplémentaire de la taille
      if (file.size > 10 * 1024 * 1024) {
        // Supprimer le fichier uploadé
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new BadRequestException('Fichier trop volumineux (max 10MB)');
      }

      // Traitement OCR
      const result = await this.ticketService.extractTotal(file.path, user);

      const processingTime = Date.now() - startTime;
      this.logger.log(`OCR terminé en ${processingTime}ms - Succès: ${result.success}`);

      return {
        ...result,
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          processingTime: `${processingTime}ms`,
        }
      };

    } catch (error) {
      // Nettoyer le fichier uniquement en cas d'erreur critique
      if (file?.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
          this.logger.log(`Fichier supprimé suite à l'erreur: ${file.path}`);
        } catch (cleanupError) {
          this.logger.warn(`Impossible de supprimer le fichier: ${cleanupError.message}`);
        }
      }

      this.logger.error(`Erreur upload ticket:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Erreur lors du traitement: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Récupérer tous les tickets de l'utilisateur connecté
   */
  @Post('all')
  async getAllTickets(@Body() body: { jwt: string }) {
    try {
      if (!body.jwt) {
        throw new BadRequestException('Token JWT requis');
      }

      const data = await this.jwtService.verifyAsync(body.jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      const user = await this.userRepository.findOne({
        where: { id: data.id }
      });

      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }

      const tickets = await this.ticketRepository.find({
        where: { user: { id: user.id } },
        order: { dateAjout: 'DESC' },
        select: [
          'id',
          'texte',
          'dateAjout',
          'totalExtrait',
          'dateTicket',
          'commercant',
          'imagePath'
        ],
      });

      return {
        success: true,
        count: tickets.length,
        tickets,
      };
    } catch (error) {
      this.logger.error('Erreur récupération tickets:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la récupération des tickets',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Supprimer un ticket
   */
  @Post('delete')
  async deleteTicket(@Body() body: { jwt: string; id: number }) {
    try {
      const { jwt, id } = body;

      if (!jwt || !id) {
        throw new BadRequestException('JWT et ID requis');
      }

      const data = await this.jwtService.verifyAsync(jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      const user = await this.userRepository.findOne({
        where: { id: data.id }
      });

      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }

      await this.ticketService.deleteTicket(id, user);

      return {
        success: true,
        message: 'Ticket supprimé avec succès.'
      };
    } catch (error) {
      this.logger.error(`Erreur suppression ticket ${body.id}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la suppression',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Récupérer un ticket spécifique
   */
  @Post('get')
  async getTicket(@Body() body: { jwt: string; id: number }) {
    try {
      const { jwt, id } = body;

      if (!jwt || !id) {
        throw new BadRequestException('JWT et ID requis');
      }

      const data = await this.jwtService.verifyAsync(jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      const user = await this.userRepository.findOne({
        where: { id: data.id }
      });

      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }

      const ticket = await this.ticketRepository.findOne({
        where: {
          id,
          user: { id: user.id }
        },
      });

      if (!ticket) {
        throw new HttpException('Ticket non trouvé', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        ticket,
      };
    } catch (error) {
      this.logger.error(`Erreur récupération ticket ${body.id}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la récupération du ticket',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Obtenir les statistiques des tickets pour l'utilisateur
   */
  @Post('stats')
  async getTicketStats(@Body() body: { jwt: string }) {
    try {
      if (!body.jwt) {
        throw new BadRequestException('Token JWT requis');
      }

      const data = await this.jwtService.verifyAsync(body.jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      const user = await this.userRepository.findOne({
        where: { id: data.id }
      });

      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }

      const [totalTickets, totalAmount] = await Promise.all([
        this.ticketRepository.count({
          where: { user: { id: user.id } }
        }),
        this.ticketRepository
          .createQueryBuilder('ticket')
          .select('SUM(ticket.totalExtrait)', 'sum')
          .where('ticket.userId = :userId', { userId: user.id })
          .andWhere('ticket.totalExtrait IS NOT NULL')
          .getRawOne()
      ]);

      const recentTickets = await this.ticketRepository.find({
        where: { user: { id: user.id } },
        order: { dateAjout: 'DESC' },
        take: 5,
        select: ['id', 'commercant', 'totalExtrait', 'dateAjout'],
      });

      return {
        success: true,
        stats: {
          totalTickets,
          totalAmount: parseFloat(totalAmount?.sum || '0'),
          recentTickets,
        },
      };
    } catch (error) {
      this.logger.error('Erreur récupération statistiques:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la récupération des statistiques',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Modifier le montant d'un ticket
   */
  @Post('update-amount')
  async updateTicketAmount(@Body() body: { jwt: string; id: number; amount: number }) {
    try {
      const { jwt, id, amount } = body;

      if (!jwt || !id || amount === undefined) {
        throw new BadRequestException('JWT, ID et montant requis');
      }

      if (amount < 0) {
        throw new BadRequestException('Le montant doit être positif');
      }

      const data = await this.jwtService.verifyAsync(jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      const user = await this.userRepository.findOne({
        where: { id: data.id }
      });

      if (!user) {
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);
      }

      const ticket = await this.ticketRepository.findOne({
        where: {
          id,
          user: { id: user.id }
        },
      });

      if (!ticket) {
        throw new HttpException('Ticket non trouvé', HttpStatus.NOT_FOUND);
      }

      ticket.totalExtrait = amount;
      await this.ticketRepository.save(ticket);

      return {
        success: true,
        message: 'Montant mis à jour avec succès',
        ticket: {
          id: ticket.id,
          totalExtrait: ticket.totalExtrait,
        }
      };
    } catch (error) {
      this.logger.error(`Erreur mise à jour montant ${body.id}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la mise à jour du montant',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Servir l'image d'un ticket
   */
  @Get('image/:id')
  async getTicketImage(
    @Param('id') id: number,
    @Res() res,
  ) {
    try {
      const ticket = await this.ticketRepository.findOne({
        where: { id },
        relations: ['user'],
      });

      if (!ticket) {
        throw new HttpException('Ticket non trouvé', HttpStatus.NOT_FOUND);
      }

      if (!ticket.imagePath || !fs.existsSync(ticket.imagePath)) {
        throw new HttpException('Image non trouvée', HttpStatus.NOT_FOUND);
      }

      // Servir l'image
      res.sendFile(ticket.imagePath);
    } catch (error) {
      this.logger.error(`Erreur récupération image ${id}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la récupération de l\'image',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}