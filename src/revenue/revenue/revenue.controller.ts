import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Headers,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';

import { JwtService } from '@nestjs/jwt';
import { RevenueDto } from '../../dto/Revenue.dto';

@Controller('revenues')
export class RevenueController {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly jwtService: JwtService,
  ) {}

  private async getUserIdFromToken(authorization: string): Promise<number> {

    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token manquant ou invalide');
    }

    let transform= authorization.split(" ")[1];
    if(!transform){
      throw new UnauthorizedException('Token manquant ou invalide');
    }
    const data = await this.jwtService.verifyAsync(transform, {
      secret: process.env.secret,
    })

    if (!data) {
      throw new UnauthorizedException();
    }

    return data?.id; // Ou `data.id` selon ton payload JWT
  }

  @Post()
  async create(@Body() dto: RevenueDto, @Headers('authorization') auth: string) {
    console.log(dto)
    const userId = await this.getUserIdFromToken(auth);
    return this.revenueService.create(dto, userId);
  }

  @Get()
  async findAll(@Headers('authorization') auth: string) {
    const userId = await this.getUserIdFromToken(auth);
    return this.revenueService.findAll(userId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevenueDto,
    @Headers('authorization') auth: string,
  ) {
    const userId = await this.getUserIdFromToken(auth);
    return this.revenueService.update(id, dto, userId);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Headers('authorization') auth: string) {
    const userId = await this.getUserIdFromToken(auth);
    return this.revenueService.remove(id, userId);
  }

  // revenue.controller.ts (ajoute ceci dans la classe)

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') auth: string,
  ) {
    const userId = await this.getUserIdFromToken(auth);
    return this.revenueService.findOne(id, userId);
  }

}
