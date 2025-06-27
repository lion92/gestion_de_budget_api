import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Revenue } from '../entity/revenue.entity';
import { RevenueController } from './revenue/revenue.controller';
import { RevenueService } from './revenue/revenue.service';
import { User } from '../entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Revenue, User]),
    JwtModule.register({}), // Même vide, il permet l'injection de JwtService
  ],
  controllers: [RevenueController],
  providers: [RevenueService],
})
export class RevenueModule {
}
