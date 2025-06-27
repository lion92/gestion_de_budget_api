import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete, UnauthorizedException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../../dto/UpdateTransactionDto';
import { JwtService } from '@nestjs/jwt';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionService: TransactionsService,
    private jwtService: JwtService,
  ) {}

  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    const data = await this.jwtService.verifyAsync(dto.jwt, {
      secret: process.env.secret,
    });
    if (!data) {
      throw new UnauthorizedException();
    }
    return this.transactionService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    const data = await this.jwtService.verifyAsync(dto.jwt, {
      secret: process.env.secret,
    });
    if (!data) {
      throw new UnauthorizedException();
    }
    return this.transactionService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id, @Body() jwt: { jwt: string }): Promise<string> {
    const data = await this.jwtService.verifyAsync(jwt.jwt, {
      secret: process.env.secret,
    });
    if (!data) {
      throw new UnauthorizedException();
    }
    await this.transactionService.delete(id);
    return 'ok';
  }


  @Get('envelope/:id')
  findByEnvelope(@Param('id') envelopeId: string) {
    return this.transactionService.findByEnvelope(envelopeId);
  }
}
