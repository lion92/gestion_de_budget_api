import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

import { JwtModule } from '@nestjs/jwt';
import { Envelope } from '../../entity/envelope.entity';
import { Transaction } from '../../entity/transaction.entity'; // 👈 à ajouter ici

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Envelope]),
    JwtModule.register({}), // 👈 à ajouter ici
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
