import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Action } from '../entity/action.entity';
import { SpendController } from './SpendController';
import { SpendService } from './Spend.service';
import { JwtService } from '@nestjs/jwt';
import { PdfService } from './Pdf.service';

@Module({
  imports: [TypeOrmModule.forFeature([Action])],
  controllers: [SpendController],
  providers: [SpendService, JwtService, PdfService],
})
export class SpendModule {}
