import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpendService } from './Spend.service';
import { Action } from '../entity/action.entity';
import { ActionDTO } from '../dto/ActionDTO';
import { User } from '../entity/user.entity'; // Import User entity
import { Categorie } from '../entity/categorie.entity'; // Import Categorie entity

describe('SpendService', () => {
  let service: SpendService;
  let repository: Repository<Action>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    execute: jest.fn(),
    // Add missing methods for QueryBuilder
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
  };

  const mockActionRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpendService,
        {
          provide: getRepositoryToken(Action),
          useValue: mockActionRepository,
        },
      ],
    }).compile();

    service = module.get<SpendService>(SpendService);
    repository = module.get<Repository<Action>>(getRepositoryToken(Action));

    // Clear mocks for query builder methods
    mockQueryBuilder.select.mockClear();
    mockQueryBuilder.innerJoin.mockClear();
    mockQueryBuilder.leftJoin.mockClear();
    mockQueryBuilder.where.mockClear();
    mockQueryBuilder.andWhere.mockClear();
    mockQueryBuilder.groupBy.mockClear();
    mockQueryBuilder.getRawMany.mockClear();
    mockQueryBuilder.execute.mockClear();
    mockQueryBuilder.leftJoinAndSelect.mockClear();
    mockQueryBuilder.addSelect.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of actions', async () => {
      const result = [{ id: 1, description: 'Test' }];
      mockActionRepository.find.mockResolvedValue(result);
      expect(await service.findAll()).toEqual(result);
      expect(repository.find).toHaveBeenCalledWith({ relations: ['user', 'categorie'] });
    });
  });

  describe('findOneBy', () => {
    it('should return a single action', async () => {
      const result = { id: 1, description: 'Test' };
      mockActionRepository.findOne.mockResolvedValue(result);
      expect(await service.findOneBy(1)).toEqual(result);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['user', 'categorie'] });
    });
  });

  describe('delete', () => {
    it('should delete an action', async () => {
      mockActionRepository.delete.mockResolvedValue({ affected: 1 });
      await service.delete(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create an action', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockCategorie: Categorie = { id: 1, categorie: 'Food', color: '#FFF', budgetDebutMois: 100, month: 1 as any, annee: 2023, user: mockUser, categoryImage: null };
      const actionDTO: ActionDTO = { id: 1, description: 'New', montant: 100, user: mockUser, categorie: mockCategorie, dateTransaction: new Date(), dateAjout: new Date() }; // Added id and dateAjout
      mockActionRepository.save.mockResolvedValue(actionDTO);
      await service.create(actionDTO);
      expect(repository.save).toHaveBeenCalledWith(actionDTO);
    });
  });

  describe('update', () => {
    it('should update an action', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockCategorie: Categorie = { id: 1, categorie: 'Food', color: '#FFF', budgetDebutMois: 100, month: 1 as any, annee: 2023, user: mockUser, categoryImage: null };
      const actionDTO: ActionDTO = { id: 1, description: 'Updated', montant: 150, user: mockUser, categorie: mockCategorie, dateTransaction: new Date(), dateAjout: new Date() }; // Added id and dateAjout
      mockActionRepository.update.mockResolvedValue({ affected: 1 });
      await service.update(1, actionDTO);
      expect(repository.update).toHaveBeenCalledWith(1, {
        description: actionDTO.description,
        user: actionDTO.user,
        categorie: actionDTO.categorie,
        dateTransaction: actionDTO.dateTransaction,
        montant: actionDTO.montant,
      });
    });
  });

  describe('findCategorieSum', () => {
    it('should return category sums', async () => {
      const result = [{ montant: 100, categorieId: 1 }];
      mockQueryBuilder.execute.mockResolvedValue(result);
      expect(await service.findCategorieSum(1, 1, 2024)).toEqual(result);
      expect(mockActionRepository.createQueryBuilder).toHaveBeenCalledWith('action');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :id', { id: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalled();
    });
  });

  describe('findSum', () => {
    it('should return total sum', async () => {
      const result = [{ montant: 500 }];
      mockQueryBuilder.execute.mockResolvedValue(result);
      expect(await service.findSum(1, 1, 2024)).toEqual(result);
      expect(mockActionRepository.createQueryBuilder).toHaveBeenCalledWith('action');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :id', { id: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('findByUser', () => {
    it('should return actions by user', async () => {
      const result = [{ id: 1, montant: 100 }];
      mockQueryBuilder.execute.mockResolvedValue(result);
      expect(await service.findByUser(1)).toEqual(result);
      expect(mockActionRepository.createQueryBuilder).toHaveBeenCalledWith('action');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :id', { id: 1 });
    });
  });

  describe('findCategorieSumAll', () => {
    it('should return all category sums for a user', async () => {
      const result = [{ montant: 100, categorieId: 1 }];
      mockQueryBuilder.execute.mockResolvedValue(result);
      expect(await service.findCategorieSumAll(1)).toEqual(result);
      expect(mockActionRepository.createQueryBuilder).toHaveBeenCalledWith('action');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :id', { id: 1 });
      expect(mockQueryBuilder.groupBy).toHaveBeenCalled();
    });
  });

  describe('findByCategorie', () => {
    it('should return actions by category', async () => {
      const result = [{ id: 1, description: 'Cat Action' }];
      mockActionRepository.find.mockResolvedValue(result);
      expect(await service.findByCategorie(1)).toEqual(result);
      expect(repository.find).toHaveBeenCalledWith({
        where: { categorie: { id: 1 } },
        relations: ['user', 'categorie'],
      });
    });
  });

  describe('findByUserAndMonthYear', () => {
    it('should return actions by user, month, and year', async () => {
      const result = [{ id: 1, description: 'Monthly Action' }];
      mockQueryBuilder.getRawMany.mockResolvedValue(result);
      expect(await service.findByUserAndMonthYear(1, 1, 2024)).toEqual(result);
      expect(mockActionRepository.createQueryBuilder).toHaveBeenCalledWith('action');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('categoryImage.iconName');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :userId', { userId: 1 });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });
});