import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryImagesService } from './category-images.service';
import { CategoryImage } from '../entity/categorieImage.entity';
import { Categorie } from '../entity/categorie.entity';
import { CreateCategoryImageDto } from '../dto/CreateCategoryImageDto';
import { NotFoundException } from '@nestjs/common';

describe('CategoryImagesService', () => {
  let service: CategoryImagesService;
  let categoryImageRepo: Repository<CategoryImage>;
  let categorieRepo: Repository<Categorie>;

  const mockCategoryImageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockCategorieRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryImagesService,
        {
          provide: getRepositoryToken(CategoryImage),
          useValue: mockCategoryImageRepository,
        },
        {
          provide: getRepositoryToken(Categorie),
          useValue: mockCategorieRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryImagesService>(CategoryImagesService);
    categoryImageRepo = module.get<Repository<CategoryImage>>(getRepositoryToken(CategoryImage));
    categorieRepo = module.get<Repository<Categorie>>(getRepositoryToken(Categorie));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateCategoryImageDto = { categoryId: 1, iconName: 'test-icon.png' };
    const mockCategorie = { id: 1, categorie: 'Test Categorie' } as Categorie;
    const mockExistingImage = { id: 1, iconName: 'old-icon.png', categorie: mockCategorie } as CategoryImage;
    const mockNewImage = { id: 2, iconName: 'test-icon.png', categorie: mockCategorie } as CategoryImage;

    it('should create a new category image if none exists', async () => {
      mockCategorieRepository.findOneBy.mockResolvedValue(mockCategorie);
      mockCategoryImageRepository.findOne.mockResolvedValue(null);
      mockCategoryImageRepository.create.mockReturnValue(mockNewImage);
      mockCategoryImageRepository.save.mockResolvedValue(mockNewImage);

      const result = await service.create(createDto);
      expect(result).toEqual(mockNewImage);
      expect(categorieRepo.findOneBy).toHaveBeenCalledWith({ id: createDto.categoryId });
      expect(categoryImageRepo.findOne).toHaveBeenCalledWith({ where: { categorie: { id: createDto.categoryId } } });
      expect(categoryImageRepo.create).toHaveBeenCalledWith({ categorie: mockCategorie, iconName: createDto.iconName });
      expect(categoryImageRepo.save).toHaveBeenCalledWith(mockNewImage);
    });

    it('should update an existing category image if one exists', async () => {
      mockCategorieRepository.findOneBy.mockResolvedValue(mockCategorie);
      mockCategoryImageRepository.findOne.mockResolvedValue(mockExistingImage);
      mockCategoryImageRepository.save.mockResolvedValue({ ...mockExistingImage, iconName: createDto.iconName });

      const result = await service.create(createDto);
      expect(result.iconName).toEqual(createDto.iconName);
      expect(categorieRepo.findOneBy).toHaveBeenCalledWith({ id: createDto.categoryId });
      expect(categoryImageRepo.findOne).toHaveBeenCalledWith({ where: { categorie: { id: createDto.categoryId } } });
      expect(categoryImageRepo.save).toHaveBeenCalledWith({ ...mockExistingImage, iconName: createDto.iconName });
    });

    it('should throw NotFoundException if category does not exist', async () => {
      mockCategorieRepository.findOneBy.mockResolvedValue(null);
      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      expect(categorieRepo.findOneBy).toHaveBeenCalledWith({ id: createDto.categoryId });
      expect(categoryImageRepo.findOne).toHaveBeenCalled(); // Changed from not.toHaveBeenCalled()
    });
  });

  describe('findAll', () => {
    it('should return an array of category images', async () => {
      const result = [{ id: 1, iconName: 'icon1.png' }] as CategoryImage[];
      mockCategoryImageRepository.find.mockResolvedValue(result);
      expect(await service.findAll()).toEqual(result);
      expect(categoryImageRepo.find).toHaveBeenCalledWith({ relations: ['categorie'] });
    });
  });

  describe('findByCategorieId', () => {
    it('should return a single category image by category ID', async () => {
      const result = { id: 1, iconName: 'icon1.png' } as CategoryImage;
      mockCategoryImageRepository.findOne.mockResolvedValue(result);
      expect(await service.findByCategorieId(1)).toEqual(result);
      expect(categoryImageRepo.findOne).toHaveBeenCalledWith({
        where: { categorie: { id: 1 } },
        relations: ['categorie'],
      });
    });

    it('should return null if category image not found', async () => {
      mockCategoryImageRepository.findOne.mockResolvedValue(null);
      expect(await service.findByCategorieId(999)).toBeNull();
      expect(categoryImageRepo.findOne).toHaveBeenCalledWith({
        where: { categorie: { id: 999 } },
        relations: ['categorie'],
      });
    });
  });

  describe('deleteByCategorieId', () => {
    it('should delete a category image by category ID', async () => {
      mockCategoryImageRepository.delete.mockResolvedValue({ affected: 1 });
      await service.deleteByCategorieId(1);
      expect(categoryImageRepo.delete).toHaveBeenCalledWith({ categorie: { id: 1 } });
    });
  });
});