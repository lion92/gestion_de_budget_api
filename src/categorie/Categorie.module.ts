import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Categorie } from '../entity/Categorie.entity';
import { CategorieController } from './Categorie.controller';
import { CategorieService } from './Categorie.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Categorie])],
  controllers: [CategorieController],
  providers: [CategorieService, JwtService],
})
export class categorieModule {
}
