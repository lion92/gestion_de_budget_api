import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActionDTO } from '../dto/ActionDTO';
import { Action } from '../entity/action.entity';

@Injectable()
export class SpendService {
  constructor(
    @InjectRepository(Action)
    private actionRepository: Repository<Action>,
  ) {}

  findAll(): Promise<Action[]> {
    return this.actionRepository.find({ relations: ['user', 'categorie'] });
  }

  async findOneBy(id: number): Promise<Action | null> {
    return await this.actionRepository.findOne({
      where: { id: id },
      relations: ['user', 'categorie'],
    });
  }

  async delete(id: number) {
    await this.actionRepository.delete(id);
    console.log('1');
  }

  async create(actionDTO: ActionDTO) {
    await this.actionRepository.save(actionDTO);
  }

  async update(id: number, actionDTO: ActionDTO) {
    await this.actionRepository.update(id, {
      description: actionDTO.description,
      user: actionDTO.user,
      categorie: actionDTO.categorie,
      dateTransaction: actionDTO.dateTransaction,
      montant: parseInt('' + actionDTO.montant),
    });
  }

  async findCategorieSum(id, month, year) {
    const qb = this.actionRepository.createQueryBuilder('action');
    qb.select([
      'SUM(montant) AS montant',
      'categorie.id AS categorieId',
      'categorie.color AS color',
      'categorie.categorie AS categorie',
      'categoryImage.iconName AS iconName',
      'action.userId AS userId',
      'action.dateAjout AS dateAjout',
      'action.dateTransaction AS dateTransaction',
      'categorie.budgetDebutMois AS budgetDebutMois'
    ]);
    qb.innerJoin('action.user', 'user');
    qb.innerJoin('action.categorie', 'categorie');
    qb.leftJoin('category_image', 'categoryImage', 'categoryImage.categorieId = categorie.id');
    qb.where('user.id = :id', { id })
      .andWhere('EXTRACT(month FROM action.dateTransaction) = :month', { month })
      .andWhere('EXTRACT(year FROM action.dateTransaction) = :year', { year });
    qb.groupBy('categorie.id, categorie.color, categorie.categorie, categoryImage.iconName, categorie.budgetDebutMois, action.userId, action.dateAjout, action.dateTransaction');
    return qb.execute();
  }

  async findSum(id, month, year) {
    const qb = this.actionRepository.createQueryBuilder('action');
    qb.select([
      'SUM(montant) AS montant',
      'action.userId AS userId',
      'action.dateAjout AS dateAjout',
      'action.dateTransaction AS dateTransaction'
    ]);
    qb.innerJoin('action.user', 'user');
    qb.where('user.id = :id', { id })
      .andWhere('EXTRACT(month FROM action.dateTransaction) = :month', { month })
      .andWhere('EXTRACT(year FROM action.dateTransaction) = :year', { year });
    return qb.execute();
  }

  async findByUser(id): Promise<any[]> {
    const qb = this.actionRepository.createQueryBuilder('action');
    qb.select([
      'action.id AS id',
      'montant',
      'categorie.categorie AS categorie',
      'categorie.color AS color',
      'categoryImage.iconName AS iconName',
      'description',
      'user.id AS user',
      'categorie.id AS categorieId',
      'dateAjout',
      'dateTransaction'
    ]);
    qb.innerJoin('action.user', 'user');
    qb.innerJoin('action.categorie', 'categorie');
    qb.leftJoin('category_image', 'categoryImage', 'categoryImage.categorieId = categorie.id');
    qb.where('user.id = :id', { id });
    return qb.execute();
  }

  findCategorieSumAll(id) {
    const qb = this.actionRepository.createQueryBuilder('action');
    qb.select([
      'SUM(montant) AS montant',
      'categorie.id AS categorieId',
      'categorie.color AS color',
      'categorie.categorie AS categorie',
      'categoryImage.iconName AS iconName',
      'action.userId AS userId',
      'action.dateAjout AS dateAjout',
      'action.dateTransaction AS dateTransaction',
      'categorie.budgetDebutMois AS budgetDebutMois'
    ]);
    qb.innerJoin('action.user', 'user');
    qb.innerJoin('action.categorie', 'categorie');
    qb.leftJoin('category_image', 'categoryImage', 'categoryImage.categorieId = categorie.id');
    qb.where('user.id = :id', { id });
    qb.groupBy('categorie.id, categorie.color, categorie.categorie, categoryImage.iconName, categorie.budgetDebutMois, action.userId, action.dateAjout, action.dateTransaction');
    return qb.execute();
  }

  async findByCategorie(categorieId: number): Promise<Action[]> {
    return this.actionRepository.find({
      where: {
        categorie: { id: categorieId },
      },
      relations: ['user', 'categorie'],
    });
  }

  async findByUserAndMonthYear(userId: number, month: number, year: number): Promise<Action[]> {
    return this.actionRepository
      .createQueryBuilder('action')
      .leftJoinAndSelect('action.user', 'user')
      .leftJoinAndSelect('action.categorie', 'categorie')
      .leftJoin('category_image', 'categoryImage', 'categoryImage.categorieId = categorie.id')
      .addSelect('categoryImage.iconName')
      .where('user.id = :userId', { userId })
      .andWhere('EXTRACT(month FROM action.dateTransaction) = :month', { month })
      .andWhere('EXTRACT(year FROM action.dateTransaction) = :year', { year })
      .getRawMany();
  }
}
