import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { JwtService } from '@nestjs/jwt';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../../dto/UpdateTransactionDto';
import { UnauthorizedException } from '@nestjs/common';
import { Transaction } from '../../entity/transaction.entity';
import { Envelope } from '../../entity/envelope.entity'; // Import Envelope entity

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let transactionService: TransactionsService;
  let jwtService: JwtService;

  const mockTransactionsService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByEnvelope: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    transactionService = module.get<TransactionsService>(TransactionsService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction if JWT is valid', async () => {
      const createDto: CreateTransactionDto = { description: 'Test', amount: 100, envelopeId: '1', jwt: 'valid_jwt' };
      const mockEnvelope: Envelope = { id: '1', name: 'Test Envelope', amount: 0, month: 1, year: 2024, icone: '', user: null, transactions: [] }; // Mock Envelope
      const result = { id: '1', ...createDto, envelope: mockEnvelope } as Transaction; // Added envelope
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockTransactionsService.create.mockResolvedValue(result);

      expect(await controller.create(createDto)).toEqual(result);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(transactionService.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const createDto: CreateTransactionDto = { description: 'Test', amount: 100, envelopeId: '1', jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException());

      await expect(controller.create(createDto)).rejects.toThrow(UnauthorizedException);
      // The service method should NOT be called if UnauthorizedException is thrown
      expect(transactionService.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a transaction if JWT is valid', async () => {
      const updateDto: UpdateTransactionDto = { description: 'Updated', amount: 150, jwt: 'valid_jwt' };
      const mockEnvelope: Envelope = { id: '1', name: 'Test Envelope', amount: 0, month: 1, year: 2024, icone: '', user: null, transactions: [] }; // Mock Envelope
      const result = { id: '1', ...updateDto, envelope: mockEnvelope } as Transaction; // Added envelope
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockTransactionsService.update.mockResolvedValue(result);

      expect(await controller.update('1', updateDto)).toEqual(result);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(transactionService.update).toHaveBeenCalledWith('1', updateDto);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const updateDto: UpdateTransactionDto = { description: 'Updated', amount: 150, jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException());

      await expect(controller.update('1', updateDto)).rejects.toThrow(UnauthorizedException);
      // The service method should NOT be called if UnauthorizedException is thrown
      expect(transactionService.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a transaction if JWT is valid', async () => {
      const jwtPayload = { jwt: 'valid_jwt' };
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockTransactionsService.delete.mockResolvedValue(undefined);

      expect(await controller.remove('1', jwtPayload)).toBe('ok');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(transactionService.delete).toHaveBeenCalledWith('1');
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const jwtPayload = { jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException());

      await expect(controller.remove('1', jwtPayload)).rejects.toThrow(UnauthorizedException);
      // The service method should NOT be called if UnauthorizedException is thrown
      expect(transactionService.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByEnvelope', () => {
    it('should return transactions for a given envelope ID', async () => {
      const result = [{ id: '1', description: 'Env Transaction' }] as Transaction[];
      mockTransactionsService.findByEnvelope.mockResolvedValue(result);
      expect(await controller.findByEnvelope('envelope-id')).toEqual(result);
      expect(transactionService.findByEnvelope).toHaveBeenCalledWith('envelope-id');
    });
  });
});