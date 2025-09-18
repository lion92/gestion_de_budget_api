import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../entity/transaction.entity';
import { Envelope } from '../../entity/envelope.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateTransactionDto } from '../../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../../dto/UpdateTransactionDto';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let transactionRepository: Repository<Transaction>;
  let envelopeRepository: Repository<Envelope>;

  const mockTransactionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  const mockEnvelopeRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(Envelope),
          useValue: mockEnvelopeRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    transactionRepository = module.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );
    envelopeRepository = module.get<Repository<Envelope>>(
      getRepositoryToken(Envelope),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException when envelope not found', async () => {
      const createDto: CreateTransactionDto = {
        description: 'Test transaction',
        amount: 100,
        envelopeId: 'non-existent-id',
        jwt: 'mock_jwt', // Added jwt
      };

      mockEnvelopeRepository.findOneBy.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should create transaction successfully', async () => {
      const createDto: CreateTransactionDto = {
        description: 'Test transaction',
        amount: 100,
        envelopeId: 'envelope-id',
        date: new Date('2024-01-01'), // Changed to Date object
        jwt: 'mock_jwt', // Added jwt
      };

      const mockEnvelope = { id: 'envelope-id', name: 'Test Envelope' };
      const mockTransaction = {
        id: 'transaction-id',
        description: 'Test transaction',
        amount: 100,
        date: new Date('2024-01-01'),
        envelope: mockEnvelope,
      };

      mockEnvelopeRepository.findOneBy.mockResolvedValue(mockEnvelope);
      mockTransactionRepository.create.mockReturnValue(mockTransaction);
      mockTransactionRepository.save.mockResolvedValue(mockTransaction);

      const result = await service.create(createDto);

      expect(mockEnvelopeRepository.findOneBy).toHaveBeenCalledWith({
        id: 'envelope-id',
      });
      expect(mockTransactionRepository.create).toHaveBeenCalledWith({
        description: 'Test transaction',
        amount: 100,
        date: new Date('2024-01-01'),
        envelope: mockEnvelope,
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should use current date when no date provided', async () => {
      const createDto: CreateTransactionDto = {
        description: 'Test transaction',
        amount: 100,
        envelopeId: 'envelope-id',
        jwt: 'mock_jwt', // Added jwt
      };

      const mockEnvelope = { id: 'envelope-id', name: 'Test Envelope' };
      const mockTransaction = { id: 'transaction-id' };

      mockEnvelopeRepository.findOneBy.mockResolvedValue(mockEnvelope);
      mockTransactionRepository.create.mockReturnValue(mockTransaction);
      mockTransactionRepository.save.mockResolvedValue(mockTransaction);

      await service.create(createDto);

      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test transaction',
          amount: 100,
          date: expect.any(Date),
          envelope: mockEnvelope,
        }),
      );
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when transaction not found', async () => {
      const updateDto: UpdateTransactionDto = {
        description: 'Updated description',
        jwt: 'mock_jwt', // Added jwt
      };

      mockTransactionRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update transaction successfully', async () => {
      const updateDto: UpdateTransactionDto = {
        description: 'Updated description',
        amount: 200,
        jwt: 'mock_jwt', // Added jwt
      };

      const mockTransaction = {
        id: 'transaction-id',
        description: 'Original description',
        amount: 100,
      };

      const updatedTransaction = {
        ...mockTransaction,
        ...updateDto,
      };

      mockTransactionRepository.findOneBy.mockResolvedValue(mockTransaction);
      mockTransactionRepository.save.mockResolvedValue(updatedTransaction);

      const result = await service.update('transaction-id', updateDto);

      expect(mockTransactionRepository.findOneBy).toHaveBeenCalledWith({
        id: 'transaction-id',
      });
      expect(mockTransactionRepository.save).toHaveBeenCalledWith(
        updatedTransaction,
      );
      expect(result).toEqual(updatedTransaction);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when transaction not found', async () => {
      mockTransactionRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete transaction successfully', async () => {
      mockTransactionRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete('transaction-id');

      expect(mockTransactionRepository.delete).toHaveBeenCalledWith(
        'transaction-id',
      );
    });
  });

  describe('findByEnvelope', () => {
    it('should return transactions for envelope', async () => {
      const mockTransactions = [
        {
          id: '1',
          description: 'Transaction 1',
          amount: 100,
          date: new Date('2024-01-02'),
        },
        {
          id: '2',
          description: 'Transaction 2',
          amount: 200,
          date: new Date('2024-01-01'),
        },
      ];

      mockTransactionRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.findByEnvelope('envelope-id');

      expect(mockTransactionRepository.find).toHaveBeenCalledWith({
        where: { envelope: { id: 'envelope-id' } },
        order: { date: 'DESC' },
      });
      expect(result).toEqual(mockTransactions);
    });
  });
});