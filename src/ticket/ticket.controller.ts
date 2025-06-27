import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { Response } from 'express';
import { TicketService } from './ticket.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Ticket } from '../entity/ticket.entity';

const uploadPath = join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

@Controller('ticket')
export class TicketController {
  constructor(
    private readonly ticketService: TicketService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadPath,
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
        const ext = extname(file.originalname).toLowerCase();
        if (!allowed.includes(ext)) {
          return cb(
            new HttpException(
              'Fichier non supporté (jpg, jpeg, png, pdf)',
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 Mo
      },
    }),
  )
  async uploadTicket(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { jwt: string },
    @Res() res: Response,
  ) {
    try {
      const { jwt } = body;

      const data = await this.jwtService.verifyAsync(jwt, {
        secret: process.env.secret,
      });

      if (!data) throw new UnauthorizedException();

      const user = await this.userRepository.findOne({
        where: { id: data.id },
      });

      if (!user)
        throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);

      const result = await this.ticketService.extractTotal(file.path, user);
      return res.status(200).json(result);
    } catch (err) {
      console.error('❌ Erreur ticket upload:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  @Post('all')
  async getAll(@Body() body: { jwt: string }) {
    const { jwt } = body;

    const data = await this.jwtService.verifyAsync(jwt, {
      secret: process.env.secret,
    });

    if (!data) throw new UnauthorizedException();

    const user = await this.userRepository.findOne({ where: { id: data.id } });

    if (!user)
      throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);

    return await this.ticketRepository.find({
      where: { user: { id: user.id } },
      order: { dateAjout: 'DESC' },
    });
  }

  @Post('delete')
  async deleteTicket(@Body() body: { jwt: string; id: number }) {
    const { jwt, id } = body;

    const data = await this.jwtService.verifyAsync(jwt, {
      secret: process.env.secret,
    });

    if (!data) throw new UnauthorizedException();

    const user = await this.userRepository.findOne({ where: { id: data.id } });

    if (!user)
      throw new HttpException('Utilisateur non trouvé', HttpStatus.NOT_FOUND);

    await this.ticketService.deleteTicket(id, user);
    return { message: 'Ticket supprimé avec succès.' };
  }
}
