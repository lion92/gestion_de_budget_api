import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategorieService } from './Categorie.service';
import { Categorie } from '../entity/categorie.entity';
import { CategorieDTO } from '../dto/CategorieDTO';
import { User } from '../entity/user.entity'; // Import User entity
import Month from '../dto/enumMonth/Month'; // Import Month enum

describe('CategorieService', () => {
  let service: CategorieService;
  let repository: Repository<Categorie>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getSql: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockCategorieRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategorieService,
        {
          provide: getRepositoryToken(Categorie),
          useValue: mockCategorieRepository,
        },
      ],
    }).compile();

    service = module.get<CategorieService>(CategorieService);
    repository = module.get<Repository<Categorie>>(getRepositoryToken(Categorie));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      const result = [{ id: 1, categorie: 'Test', color: '#FFF', user: {} as User, month: Month.Janvier, annee: 2023, budgetDebutMois: 100 }];
      mockCategorieRepository.find.mockResolvedValue(result);
      expect(await service.findAll()).toEqual(result);
      expect(repository.find).toHaveBeenCalled();
    });
  });

  describe('findOneBy', () => {
    it('should return a single category', async () => {
      const result = { id: 1, categorie: 'Test', color: '#FFF', user: {} as User, month: Month.Janvier, annee: 2023, budgetDebutMois: 100 };
      mockCategorieRepository.findOneBy.mockResolvedValue(result);
      expect(await service.findOneBy(1)).toEqual(result);
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should return null if category not found', async () => {
      mockCategorieRepository.findOneBy.mockResolvedValue(null);
      expect(await service.findOneBy(999)).toBeNull();
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 999 });
    });
  });

  describe('delete', () => {
    it('should delete a category', async () => {
      mockCategorieRepository.delete.mockResolvedValue({ affected: 1 });
      await service.delete(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const categorieDTO: CategorieDTO = { id: undefined, categorie: 'New', color: '#000', user: mockUser, month: Month.Fevrier, annee: 2023, budgetDebutMois: 100 }; // Used mockUser and Month.Fevrier
      const result = { id: 2, ...categorieDTO };
      mockCategorieRepository.save.mockResolvedValue(result);
      expect(await service.create(categorieDTO)).toEqual(result);
      expect(repository.save).toHaveBeenCalledWith(categorieDTO);
    });
  });

  describe('update', () => {
    it('should update an existing category', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const categorieDTO: CategorieDTO = { id: 1, categorie: 'Updated', color: '#CCC', user: mockUser, month: Month.Janvier, annee: 2023, budgetDebutMois: 100 }; // Used mockUser and Month.Janvier
      mockCategorieRepository.update.mockResolvedValue({ affected: 1 });
      await service.update(1, categorieDTO);
      expect(repository.update).toHaveBeenCalledWith(1, {
        categorie: categorieDTO.categorie,
        color: categorieDTO.color,
        user: categorieDTO.user,
        month: categorieDTO.month,
        annee: categorieDTO.annee,
        budgetDebutMois: categorieDTO.budgetDebutMois,
      });
    });
  });

  describe('findByUser', () => {
    it('should return categories for a given user', async () => {
      const userId = 1;
      const expectedResult = [{ id: 1, categorie: 'UserCat', iconName: 'icon.png' }];

      mockQueryBuilder.execute.mockResolvedValue(expectedResult);

      const result = await service.findByUser(userId);
      expect(result).toEqual(expectedResult);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('categorie');
    });
  });
});