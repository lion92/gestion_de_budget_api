import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { Action } from '../entity/action.entity';
import { Categorie } from '../entity/categorie.entity';
import { User } from '../entity/user.entity';
import { SpendModule } from '../spend/SpendModule'; // 👈 adapte si ton chemin est différent
import { JwtModule } from '@nestjs/jwt';
import { Ticket } from '../entity/ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Action, Categorie, User, Ticket]),
    JwtModule.register({}), // Pas besoin de secret ici si déjà défini ailleurs
    SpendModule, // 👈 Obligatoire pour accéder à SpendService
  ],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
