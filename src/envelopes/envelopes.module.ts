import { Module } from '@nestjs/common';
import { EnvelopesService } from './envelopes.service';
import { EnvelopesController } from './envelopes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Envelope } from '../entity/envelope.entity';
import { User } from '../entity/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { Transaction } from '../entity/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Envelope, User, Transaction]),
    JwtModule.register({}), // Requis car utilisé dans le controller pour vérifier le token
  ],
  controllers: [EnvelopesController],
  providers: [EnvelopesService],
})
export class EnvelopesModule {}
