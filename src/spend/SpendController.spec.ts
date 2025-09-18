import { Test, TestingModule } from '@nestjs/testing';
import { SpendController } from './SpendController';
import { SpendService } from './Spend.service';
import { JwtService } from '@nestjs/jwt';
import { PdfService } from './Pdf.service';
import { ActionDTO } from '../dto/ActionDTO';
import { UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import * as nodeExcelExport from 'node-excel-export';
import { User } from '../entity/user.entity'; // Import User entity
import { Categorie } from '../entity/categorie.entity'; // Import Categorie entity

// Mock node-excel-export
jest.mock('node-excel-export', () => ({
  buildExport: jest.fn(() => Buffer.from('mock excel data')),
}));

describe('SpendController', () => {
  let controller: SpendController;
  let spendService: SpendService;
  let jwtService: JwtService;
  let pdfService: PdfService;

  const mockSpendService = {
    findAll: jest.fn(),
    findCategorieSum: jest.fn(),
    findSum: jest.fn(),
    findCategorieSumAll: jest.fn(),
    findByUser: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockPdfService = {
    generatePdf: jest.fn(),
    generatePdfSumAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SpendController],
      providers: [
        {
          provide: SpendService,
          useValue: mockSpendService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
      ],
    }).compile();

    controller = module.get<SpendController>(SpendController);
    spendService = module.get<SpendService>(SpendService);
    jwtService = module.get<JwtService>(JwtService);
    pdfService = module.get<PdfService>(PdfService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of actions', async () => {
      const result = [{ id: 1, description: 'Test' }];
      mockSpendService.findAll.mockResolvedValue(result);
      expect(await controller.findAll()).toEqual(result);
      expect(spendService.findAll).toHaveBeenCalled();
    });
  });

  describe('findCategorieSum', () => {
    it('should return category sums', async () => {
      const result = [{ montant: 100, categorieId: 1 }];
      mockSpendService.findCategorieSum.mockResolvedValue(result);
      const mockRequest = {} as Request;
      expect(await controller.findCategorieSum(1, 1, 2024, mockRequest)).toEqual(result);
      expect(spendService.findCategorieSum).toHaveBeenCalledWith(1, 1, 2024);
    });
  });

  describe('findSum', () => {
    it('should return total sum', async () => {
      const result = [{ montant: 500 }];
      mockSpendService.findSum.mockResolvedValue(result);
      const mockRequest = {} as Request;
      expect(await controller.findSum(1, 1, 2024, mockRequest)).toEqual(result);
      expect(spendService.findSum).toHaveBeenCalledWith(1, 1, 2024);
    });
  });

  describe('findCategorieSumAll', () => {
    it('should return all category sums for a user', async () => {
      const result = [{ montant: 100, categorieId: 1 }];
      mockSpendService.findCategorieSumAll.mockResolvedValue(result);
      const mockRequest = {} as Request;
      expect(await controller.findCategorieSumAll(1, mockRequest)).toEqual(result);
      expect(spendService.findCategorieSumAll).toHaveBeenCalledWith(1);
    });
  });

  describe('export', () => {
    it('should export data to excel', async () => {
      const mockListMontants = [{ montant: 10, description: 'Desc', categorie: 'Cat', dateAjout: new Date() }];
      mockSpendService.findByUser.mockResolvedValue(mockListMontants);

      const mockResponse = {
        attachment: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as unknown as Response;

      await controller.export(mockResponse, 1);

      expect(spendService.findByUser).toHaveBeenCalledWith(1);
      expect(nodeExcelExport.buildExport).toHaveBeenCalled();
      expect(mockResponse.attachment).toHaveBeenCalledWith('report.xlsx');
      expect(mockResponse.send).toHaveBeenCalledWith(Buffer.from('mock excel data'));
    });
  });

  describe('findOne', () => {
    it('should return a single action', async () => {
      const result = { id: 1, description: 'Test' };
      mockSpendService.findOneBy.mockResolvedValue(result);
      expect(await controller.findOne(1)).toEqual(result);
      expect(spendService.findOneBy).toHaveBeenCalledWith(1);
    });
  });

  describe('findAllByUser', () => {
    it('should return actions by user', async () => {
      const result = [{ id: 1, description: 'User Action' }];
      mockSpendService.findByUser.mockResolvedValue(result);
      expect(await controller.findAllByUser(1)).toEqual(result);
      expect(spendService.findByUser).toHaveBeenCalledWith(1);
    });
  });

  describe('remove', () => {
    it('should delete an action if JWT is valid', async () => {
      const jwtPayload = { jwt: 'valid_jwt' };
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockSpendService.delete.mockResolvedValue(undefined);

      expect(await controller.remove(1, jwtPayload)).toBe('ok');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(spendService.delete).toHaveBeenCalledWith(1);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const jwtPayload = { jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException()); // Changed to mockRejectedValue

      await expect(controller.remove(1, jwtPayload)).rejects.toThrow(UnauthorizedException);
      expect(spendService.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an action if JWT is valid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockCategorie: Categorie = { id: 1, categorie: 'Food', color: '#FFF', budgetDebutMois: 100, month: 1 as any, annee: 2023, user: mockUser, categoryImage: null };
      const actionDTO: ActionDTO = { id: 1, description: 'Updated', montant: 150, user: mockUser, categorie: mockCategorie, dateTransaction: new Date(), dateAjout: new Date(), jwt: 'valid_jwt' }; // Added id and dateAjout
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockSpendService.update.mockResolvedValue(undefined);

      expect(await controller.update(1, actionDTO)).toBe('ok');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(spendService.update).toHaveBeenCalledWith(1, actionDTO);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockCategorie: Categorie = { id: 1, categorie: 'Food', color: '#FFF', budgetDebutMois: 100, month: 1 as any, annee: 2023, user: mockUser, categoryImage: null };
      const actionDTO: ActionDTO = { id: 1, description: 'Updated', montant: 150, user: mockUser, categorie: mockCategorie, dateTransaction: new Date(), dateAjout: new Date(), jwt: 'invalid_jwt' }; // Added id and dateAjout
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException()); // Changed to mockRejectedValue

      await expect(controller.update(1, actionDTO)).rejects.toThrow(UnauthorizedException);
      expect(spendService.update).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create an action if JWT is valid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockCategorie: Categorie = { id: 1, categorie: 'Food', color: '#FFF', budgetDebutMois: 100, month: 1 as any, annee: 2023, user: mockUser, categoryImage: null };
      const actionDTO: ActionDTO = { id: 1, description: 'New', montant: 100, user: mockUser, categorie: mockCategorie, dateTransaction: new Date(), dateAjout: new Date(), jwt: 'valid_jwt' }; // Added id and dateAjout
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockSpendService.create.mockResolvedValue(undefined);

      await controller.create(actionDTO);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(spendService.create).toHaveBeenCalledWith(actionDTO);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockCategorie: Categorie = { id: 1, categorie: 'Food', color: '#FFF', budgetDebutMois: 100, month: 1 as any, annee: 2023, user: mockUser, categoryImage: null };
      const actionDTO: ActionDTO = { id: 1, description: 'New', montant: 100, user: mockUser, categorie: mockCategorie, dateTransaction: new Date(), dateAjout: new Date(), jwt: 'invalid_jwt' }; // Added id and dateAjout
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException()); // Changed to mockRejectedValue

      await expect(controller.create(actionDTO)).rejects.toThrow(UnauthorizedException);
      expect(spendService.create).not.toHaveBeenCalled();
    });
  });

  describe('generatePdf', () => {
    it('should generate a PDF', async () => {
      const mockPdfStream = { pipe: jest.fn() };
      mockPdfService.generatePdf.mockResolvedValue(mockPdfStream);

      const mockResponse = {
        setHeader: jest.fn(),
        pipe: jest.fn(),
      } as unknown as Response;

      await controller.generatePdf(mockResponse, 1);

      expect(pdfService.generatePdf).toHaveBeenCalledWith(1);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="example.pdf"');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockPdfStream.pipe).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('generatePDFAll', () => {
    it('should generate an "all categories" PDF', async () => {
      const mockPdfStream = { pipe: jest.fn() };
      mockPdfService.generatePdfSumAll.mockResolvedValue(mockPdfStream);

      const mockResponse = {
        setHeader: jest.fn(),
        pipe: jest.fn(),
      } as unknown as Response;

      await controller.generatePDFAll(mockResponse, 1);

      expect(pdfService.generatePdfSumAll).toHaveBeenCalledWith(1);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="example.pdf"');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockPdfStream.pipe).toHaveBeenCalledWith(mockResponse);
    });
  });
});