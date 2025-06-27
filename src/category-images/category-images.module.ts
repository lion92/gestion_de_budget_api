// src/category-images/category-images.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryImage } from '../entity/categorieImage.entity';
import { Categorie } from '../entity/categorie.entity';
import { CategoryImagesService } from './category-images.service';
import { CategoryImagesController } from './category-images.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoryImage, Categorie]),
    JwtModule.register({}), // charge le module JWT pour vérification
  ],
  controllers: [CategoryImagesController],
  providers: [CategoryImagesService],
})
export class CategoryImagesModule {}
