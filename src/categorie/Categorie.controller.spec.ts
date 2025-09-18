import { Test, TestingModule } from '@nestjs/testing';
import { CategorieController } from './Categorie.controller';
import { CategorieService } from './Categorie.service';
import { JwtService } from '@nestjs/jwt';
import { CategorieDTO } from '../dto/CategorieDTO';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '../entity/user.entity'; // Import User entity
import Month from '../dto/enumMonth/Month'; // Import Month enum

describe('CategorieController', () => {
  let controller: CategorieController;
  let service: CategorieService;
  let jwtService: JwtService;

  const mockCategorieService = {
    findAll: jest.fn(),
    findByUser: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategorieController],
      providers: [
        {
          provide: CategorieService,
          useValue: mockCategorieService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<CategorieController>(CategorieController);
    service = module.get<CategorieService>(CategorieService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      const result = [{ id: 1, categorie: 'Test', color: '#FFF' }];
      mockCategorieService.findAll.mockResolvedValue(result);
      expect(await controller.findAll()).toEqual(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('should return an array of categories for a given user', async () => {
      const result = [{ id: 1, categorie: 'UserCat', color: '#FFF' }];
      mockCategorieService.findByUser.mockResolvedValue(result);
      expect(await controller.findAllByUser(1)).toEqual(result);
      expect(service.findByUser).toHaveBeenCalledWith(1);
    });
  });

  describe('findOne', () => {
    it('should return a single category', async () => {
      const result = { id: 1, categorie: 'Test', color: '#FFF' };
      mockCategorieService.findOneBy.mockResolvedValue(result);
      expect(await controller.findOne(1)).toEqual(result);
      expect(service.findOneBy).toHaveBeenCalledWith(1);
    });

    it('should return undefined if category not found', async () => {
      mockCategorieService.findOneBy.mockResolvedValue(undefined);
      expect(await controller.findOne(999)).toBeUndefined();
      expect(service.findOneBy).toHaveBeenCalledWith(999);
    });
  });

  describe('remove', () => {
    it('should delete a category if JWT is valid', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockCategorieService.delete.mockResolvedValue(undefined);
      expect(await controller.remove(1, { jwt: 'valid_jwt' })).toBe('ok');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(service.delete).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException());
      await expect(controller.remove(1, { jwt: 'invalid_jwt' })).rejects.toThrow(UnauthorizedException);
      // The service method should NOT be called if UnauthorizedException is thrown
      expect(service.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an existing category', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const categorieDTO: CategorieDTO = { id: 1, categorie: 'Updated', color: '#CCC', user: mockUser, month: Month.Janvier, annee: 2023, budgetDebutMois: 100, jwt: 'valid_jwt' };
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockCategorieService.update.mockResolvedValue(undefined);
      expect(await controller.update(1, categorieDTO)).toBe('ok');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(service.update).toHaveBeenCalledWith(1, categorieDTO);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const categorieDTO: CategorieDTO = { id: 1, categorie: 'Updated', color: '#CCC', user: mockUser, month: Month.Janvier, annee: 2023, budgetDebutMois: 100, jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException());
      await expect(controller.update(1, categorieDTO)).rejects.toThrow(UnauthorizedException);
      // The service method should NOT be called if UnauthorizedException is thrown
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a category if JWT is valid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const categorieDTO: CategorieDTO = { id: undefined, categorie: 'New', color: '#000', user: mockUser, month: Month.Fevrier, annee: 2023, budgetDebutMois: 100, jwt: 'valid_jwt' };
      const result = { id: 2, ...categorieDTO };
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockCategorieService.create.mockResolvedValue(result);
      expect(await controller.create(categorieDTO, { jwt: 'valid_jwt' })).toEqual(result);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(service.create).toHaveBeenCalledWith(categorieDTO);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const categorieDTO: CategorieDTO = { id: undefined, categorie: 'New', color: '#000', user: mockUser, month: Month.Fevrier, annee: 2023, budgetDebutMois: 100, jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException());
      await expect(controller.create(categorieDTO, { jwt: 'invalid_jwt' })).rejects.toThrow(UnauthorizedException);
      // The service method should NOT be called if UnauthorizedException is thrown
      expect(service.create).not.toHaveBeenCalled();
    });
  });
});