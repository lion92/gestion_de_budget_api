// src/category-images/category-images.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CategoryImagesService } from './category-images.service';
import { CreateCategoryImageDto } from '../dto/CreateCategoryImageDto';

@Controller('category-images')
export class CategoryImagesController {
  constructor(
    private readonly categoryImagesService: CategoryImagesService,
  ) {}

  @Post()
  async create(@Body() dto: CreateCategoryImageDto) {
    console.log(dto)
    return await this.categoryImagesService.create(dto);
  }

  @Get()
  async findAll() {
    return await this.categoryImagesService.findAll();
  }

  @Get(':categoryId')
  async findByCategoryId(@Param('categoryId') categoryId: number) {
    return await this.categoryImagesService.findByCategorieId(categoryId);
  }

  @Delete(':categoryId')
  async delete(@Param('categoryId') categoryId: number) {
    await this.categoryImagesService.deleteByCategorieId(Number(categoryId));
    return 'deleted';
  }
}
