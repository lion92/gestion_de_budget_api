import { Test, TestingModule } from '@nestjs/testing';
import { EnvelopesController } from './envelopes.controller';
import { EnvelopesService } from './envelopes.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { Envelope } from '../entity/envelope.entity';
import { User } from '../entity/user.entity'; // Import User entity
import { Transaction } from '../entity/transaction.entity'; // Import Transaction entity

describe('EnvelopesController', () => {
  let controller: EnvelopesController;
  let service: EnvelopesService;
  let jwtService: JwtService;

  const mockEnvelopesService = {
    findByUserAndMonth: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnvelopesController],
      providers: [
        {
          provide: EnvelopesService,
          useValue: mockEnvelopesService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<EnvelopesController>(EnvelopesController);
    service = module.get<EnvelopesService>(EnvelopesService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of envelopes for a user, month, and year', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockTransactions: Transaction[] = [];
      const result = [{ id: '1', name: 'Test Envelope', month: 1, year: 2024, user: mockUser, transactions: mockTransactions }] as Envelope[]; // Added month and year
      mockEnvelopesService.findByUserAndMonth.mockResolvedValue(result);
      expect(await controller.findAll(1, 1, 2024)).toEqual(result);
      expect(service.findByUserAndMonth).toHaveBeenCalledWith(1, 1, 2024);
    });
  });

  describe('create', () => {
    it('should create an envelope if JWT is valid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockTransactions: Transaction[] = [];
      const body = { name: 'New Envelope', amount: 100, userId: 1, month: 1, year: 2024, icone: '💰', jwt: 'valid_jwt' };
      const result = { id: '2', ...body, user: mockUser, transactions: mockTransactions } as Envelope; // Added user and transactions
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockEnvelopesService.create.mockResolvedValue(result);

      expect(await controller.create(body)).toEqual(result);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(service.create).toHaveBeenCalledWith(body.name, body.amount, body.userId, body.month, body.year, body.icone);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const body = { name: 'New Envelope', amount: 100, userId: 1, month: 1, year: 2024, icone: '💰', jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException()); // Changed to mockRejectedValue

      await expect(controller.create(body)).rejects.toThrow(UnauthorizedException);
      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update an envelope if JWT is valid', async () => {
      const mockUser: User = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true, revenues: [], envelopes: [], tickets: [], resetPasswordToken: null, resetPasswordExpire: null };
      const mockTransactions: Transaction[] = [];
      const body = { name: 'Updated Envelope', amount: 150, icone: '🏠', jwt: 'valid_jwt' };
      const result = { id: '1', ...body, user: mockUser, transactions: mockTransactions, month: 1, year: 2024 } as Envelope; // Added user, transactions, month, year
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockEnvelopesService.update.mockResolvedValue(result);

      expect(await controller.update('1', body)).toEqual(result);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(service.update).toHaveBeenCalledWith('1', body.name, body.amount, body.icone);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const body = { name: 'Updated Envelope', amount: 150, icone: '🏠', jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException()); // Changed to mockRejectedValue

      await expect(controller.update('1', body)).rejects.toThrow(UnauthorizedException);
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an envelope if JWT is valid', async () => {
      const body = { jwt: 'valid_jwt' };
      mockJwtService.verifyAsync.mockResolvedValue({ userId: 1 });
      mockEnvelopesService.delete.mockResolvedValue(undefined);

      expect(await controller.remove('1', body)).toBe('ok');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(service.delete).toHaveBeenCalledWith('1');
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const body = { jwt: 'invalid_jwt' };
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException()); // Changed to mockRejectedValue

      await expect(controller.remove('1', body)).rejects.toThrow(UnauthorizedException);
      expect(service.delete).not.toHaveBeenCalled();
    });
  });
});