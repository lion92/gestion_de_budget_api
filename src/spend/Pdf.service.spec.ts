// Mock TypeORM before any imports
jest.mock('typeorm', () => ({
  Repository: jest.fn(),
  Entity: jest.fn(() => () => {}),
  PrimaryGeneratedColumn: jest.fn(() => () => {}),
  Column: jest.fn(() => () => {}),
  ManyToOne: jest.fn(() => () => {}),
  OneToMany: jest.fn(() => () => {}),
  JoinColumn: jest.fn(() => () => {}),
  OneToOne: jest.fn(() => () => {}),
  CreateDateColumn: jest.fn(() => () => {}),
  UpdateDateColumn: jest.fn(() => () => {}),
}));

// Mock @nestjs/typeorm
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: jest.fn(() => () => {}),
  getRepositoryToken: jest.fn(),
  TypeOrmModule: {
    forFeature: jest.fn(),
    forRoot: jest.fn(),
  },
}));

// Mock the problematic glob dependency
jest.mock('path-scurry', () => ({
  PathScurry: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './Pdf.service';
import { SpendService } from './Spend.service';
import * as fs from 'fs';
import PDFDocument from 'pdfkit-table';

// Mock SpendService
const mockSpendService = {
  findByUser: jest.fn(),
  findCategorieSumAll: jest.fn(),
};

// Mock PDFDocument and fs
jest.mock('pdfkit-table', () => ({
  default: jest.fn().mockImplementation(() => ({
    fill: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    table: jest.fn().mockReturnThis(),
    pipe: jest.fn().mockReturnThis(),
    end: jest.fn(),
    font: jest.fn().mockReturnThis(),
    fontSize: jest.fn().mockReturnThis(),
  })),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  createWriteStream: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    end: jest.fn(),
  })),
  createReadStream: jest.fn(() => ({
    pipe: jest.fn(),
  })),
}));

describe('PdfService', () => {
  let service: PdfService;
  let spendService: SpendService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfService,
        {
          provide: SpendService,
          useValue: mockSpendService,
        },
      ],
    }).compile();

    service = module.get<PdfService>(PdfService);
    spendService = module.get<SpendService>(SpendService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generatePdf', () => {
    it('should generate a PDF with user spending data', async () => {
      const mockSpendingData = [
        { montant: 100, description: 'Groceries', categorie: 'Food', dateTransaction: new Date('2024-01-15') },
        { montant: 50, description: 'Coffee', categorie: 'Food', dateTransaction: new Date('2024-01-10') },
      ];
      mockSpendService.findByUser.mockResolvedValue(mockSpendingData);

      const result = await service.generatePdf(1);

      expect(spendService.findByUser).toHaveBeenCalledWith(1);
      expect(PDFDocument).toHaveBeenCalledTimes(1);
      const docInstance = (PDFDocument as unknown as jest.Mock).mock.results[0].value;
      expect(docInstance.fill).toHaveBeenCalledWith('red');
      expect(docInstance.text).toHaveBeenCalledWith('Bilan');
      expect(docInstance.table).toHaveBeenCalledTimes(1);
      expect(docInstance.pipe).toHaveBeenCalledTimes(1);
      expect(docInstance.end).toHaveBeenCalledTimes(1);
      expect(fs.createWriteStream).toHaveBeenCalledWith('bilan.pdf');
      expect(fs.createReadStream).toHaveBeenCalledWith('bilan.pdf');
      expect(result).toBeDefined(); // Should return a ReadStream
    });
  });

  describe('generatePdfSumAll', () => {
    it('should generate a PDF with all category sums', async () => {
      const mockCategorySumData = [
        { montant: 200, categorie: 'Food', dateTransaction: new Date('2024-01-31') },
        { montant: 150, categorie: 'Transport', dateTransaction: new Date('2024-01-20') },
      ];
      mockSpendService.findCategorieSumAll.mockResolvedValue(mockCategorySumData);

      const result = await service.generatePdfSumAll(1);

      expect(spendService.findCategorieSumAll).toHaveBeenCalledWith(1);
      expect(PDFDocument).toHaveBeenCalledTimes(1);
      const docInstance = (PDFDocument as unknown as jest.Mock).mock.results[0].value;
      expect(docInstance.fill).toHaveBeenCalledWith('red');
      expect(docInstance.text).toHaveBeenCalledWith('Bilan');
      expect(docInstance.table).toHaveBeenCalledTimes(1);
      expect(docInstance.pipe).toHaveBeenCalledTimes(1);
      expect(docInstance.end).toHaveBeenCalledTimes(1);
      expect(fs.createWriteStream).toHaveBeenCalledWith('bilan.pdf');
      expect(fs.createReadStream).toHaveBeenCalledWith('bilan.pdf');
      expect(result).toBeDefined(); // Should return a ReadStream
    });
  });
});