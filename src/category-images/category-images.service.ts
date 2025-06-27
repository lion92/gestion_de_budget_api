import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryImage } from '../entity/categorieImage.entity';
import { Categorie } from '../entity/categorie.entity';
import { CreateCategoryImageDto } from '../dto/CreateCategoryImageDto';

@Injectable()
export class CategoryImagesService {
  constructor(
    @InjectRepository(CategoryImage)
    private readonly categoryImageRepo: Repository<CategoryImage>,

    @InjectRepository(Categorie)
    private readonly categorieRepo: Repository<Categorie>,
  ) {}

  async create(dto: CreateCategoryImageDto): Promise<CategoryImage> {
    const categorie = await this.categorieRepo.findOneBy({
      id: dto.categoryId,
    });
    if (!categorie) throw new NotFoundException('Catégorie non trouvée');

    const existing = await this.categoryImageRepo.findOne({
      where: { categorie: { id: dto.categoryId } },
    });

    if (existing) {
      existing.iconName = dto.iconName;
      return this.categoryImageRepo.save(existing);
    }

    const newIcon = this.categoryImageRepo.create({
      categorie,
      iconName: dto.iconName,
    });

    return this.categoryImageRepo.save(newIcon);
  }

  async findAll(): Promise<CategoryImage[]> {
    return this.categoryImageRepo.find({ relations: ['categorie'] });
  }

  async findByCategorieId(categorieId: number): Promise<CategoryImage> {
    return this.categoryImageRepo.findOne({
      where: { categorie: { id: categorieId } },
      relations: ['categorie'],
    });
  }

  async deleteByCategorieId(categorieId: number): Promise<void> {
    await this.categoryImageRepo.delete({ categorie: { id: categorieId } });
  }
}
