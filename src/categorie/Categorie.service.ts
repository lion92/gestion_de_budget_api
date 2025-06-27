import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categorie } from '../entity/categorie.entity';
import { CategorieDTO } from '../dto/CategorieDTO';

@Injectable()
export class CategorieService {
  constructor(
    @InjectRepository(Categorie)
    private categorieRepository: Repository<Categorie>,
  ) {
  }

  findAll(): Promise<Categorie[]> {
    return this.categorieRepository.find();
  }

  async findOneBy(id: number): Promise<Categorie | null> {
    return await this.categorieRepository.findOneBy({ id });
  }

  async delete(id: number) {
    await this.categorieRepository.delete(id);
    console.log('1');
  }

  async create(categorieDTO: CategorieDTO) {
    return await this.categorieRepository.save(categorieDTO)
  }

  async update(id: number, categorieDTO: CategorieDTO) {
    await this.categorieRepository.update(id, {
      categorie: categorieDTO.categorie,
      color: categorieDTO.color,
      user: categorieDTO.user,
      month: categorieDTO.month,
      annee: categorieDTO.annee,
      budgetDebutMois: categorieDTO.budgetDebutMois,
    });
  }

  async findByUser(id: number) {
    const qb = this.categorieRepository.createQueryBuilder('categorie');

    qb.select([
      'categorie.id AS id',
      'user.id AS user',
      'categorie.categorie AS categorie',
      'categorie.color AS color',
      'categorie.month AS month',
      'categorie.annee AS annee',
      'categorie.budgetDebutMois AS budgetDebutMois',
      'categoryImage.iconName AS iconName', // 👈 on récupère aussi l’icône
    ]);

    qb.innerJoin('categorie.user', 'user');
    qb.leftJoin(
      'category_image',
      'categoryImage',
      'categoryImage.categorieId = categorie.id',
    ); // 👈 LEFT JOIN

    qb.where('user.id = :id', { id });

    console.log(await qb.getSql()); // Pour debug

    return qb.execute();
  }

}
