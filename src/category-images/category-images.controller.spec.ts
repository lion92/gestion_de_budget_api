import { Test, TestingModule } from '@nestjs/testing';
import { CategoryImagesController } from './category-images.controller';
import { CategoryImagesService } from './category-images.service';
import { CreateCategoryImageDto } from '../dto/CreateCategoryImageDto';
import { CategoryImage } from '../entity/categorieImage.entity';
import { Categorie } from '../entity/categorie.entity'; // Import Categorie entity

describe('CategoryImagesController', () => {
  let controller: CategoryImagesController;
  let service: CategoryImagesService;

  const mockCategoryImagesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByCategorieId: jest.fn(),
    deleteByCategorieId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryImagesController],
      providers: [
        {
          provide: CategoryImagesService,
          useValue: mockCategoryImagesService,
        },
      ],
    }).compile();

    controller = module.get<CategoryImagesController>(CategoryImagesController);
    service = module.get<CategoryImagesService>(CategoryImagesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category image', async () => {
      const createDto: CreateCategoryImageDto = { categoryId: 1, iconName: 'test-icon.png' };
      const mockCategorie: Categorie = { id: 1, categorie: 'Test', color: '#FFF', budgetDebutMois: 0, month: null, annee: 2024, user: null, categoryImage: null }; // Mock Categorie
      const result = { id: 1, ...createDto, categorie: mockCategorie, categoryImage: null } as CategoryImage; // Added categorie and categoryImage
      mockCategoryImagesService.create.mockResolvedValue(result);
      expect(await controller.create(createDto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of category images', async () => {
      const mockCategorie: Categorie = { id: 1, categorie: 'Test', color: '#FFF', budgetDebutMois: 0, month: null, annee: 2024, user: null, categoryImage: null }; // Mock Categorie
      const result = [{ id: 1, iconName: 'icon1.png', categorie: mockCategorie, categoryImage: null }] as CategoryImage[]; // Added categorie and categoryImage
      mockCategoryImagesService.findAll.mockResolvedValue(result);
      expect(await controller.findAll()).toEqual(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findByCategoryId', () => {
    it('should return a single category image by category ID', async () => {
      const mockCategorie: Categorie = { id: 1, categorie: 'Test', color: '#FFF', budgetDebutMois: 0, month: null, annee: 2024, user: null, categoryImage: null }; // Mock Categorie
      const result = { id: 1, iconName: 'icon1.png', categorie: mockCategorie, categoryImage: null } as CategoryImage; // Added categorie and categoryImage
      mockCategoryImagesService.findByCategorieId.mockResolvedValue(result);
      expect(await controller.findByCategoryId(1)).toEqual(result);
      expect(service.findByCategorieId).toHaveBeenCalledWith(1);
    });
  });

  describe('delete', () => {
    it('should delete a category image by category ID', async () => {
      mockCategoryImagesService.deleteByCategorieId.mockResolvedValue(undefined);
      expect(await controller.delete(1)).toBe('deleted');
      expect(service.deleteByCategorieId).toHaveBeenCalledWith(1);
    });
  });
});