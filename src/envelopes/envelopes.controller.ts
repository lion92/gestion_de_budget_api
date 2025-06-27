import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { EnvelopesService } from './envelopes.service';
import { JwtService } from '@nestjs/jwt';

@Controller('envelopes')
export class EnvelopesController {
  constructor(
    private readonly envelopeService: EnvelopesService,
    private readonly jwtService: JwtService,
  ) {}

  // 📄 Récupérer toutes les enveloppes d’un utilisateur pour un mois et une année
  @Get(':userId/:month/:year')
  async findAll(
    @Param('userId') userId: number,
    @Param('month') month: number,
    @Param('year') year: number,
  ) {
    return this.envelopeService.findByUserAndMonth(userId, month, year);
  }

  // ➕ Créer une enveloppe
  @Post()
  async create(@Body() body: any) {
    const { name, amount, userId, month, year, icone, jwt } = body;

    const data = await this.jwtService.verifyAsync(jwt, {
      secret: process.env.secret,
    });

    if (!data) throw new UnauthorizedException();

    return this.envelopeService.create(
      name,
      amount,
      userId,
      month,
      year,
      icone,
    );
  }

  // ✏️ Modifier le nom d’une enveloppe
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const { name, amount, jwt, icone } = body;

    const data = await this.jwtService.verifyAsync(jwt, {
      secret: process.env.secret,
    });

    if (!data) throw new UnauthorizedException();

    return this.envelopeService.update(id, name, amount, icone);
  }

  // ❌ Supprimer une enveloppe
  @Delete(':id')
  async remove(@Param('id') id: string, @Body() body: any) {
    const { jwt } = body;

    const data = await this.jwtService.verifyAsync(jwt, {
      secret: process.env.secret,
    });

    if (!data) throw new UnauthorizedException();

    await this.envelopeService.delete(id);
    return 'ok';
  }
}
