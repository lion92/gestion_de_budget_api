import { Test, TestingModule } from '@nestjs/testing';
import { EnvelopesService } from './envelopes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Envelope } from '../entity/envelope.entity';
import { User } from '../entity/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('EnvelopesService', () => {
  let service: EnvelopesService;
  let envelopeRepository: Repository<Envelope>;
  let userRepository: Repository<User>;

  const mockEnvelopeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  const mockUserRepository = {
    findOneBy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvelopesService,
        {
          provide: getRepositoryToken(Envelope),
          useValue: mockEnvelopeRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<EnvelopesService>(EnvelopesService);
    envelopeRepository = module.get<Repository<Envelope>>(
      getRepositoryToken(Envelope),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.create('Test Envelope', 1000, 999, 1, 2024, '💰'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create envelope successfully', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };
      const mockEnvelope = {
        id: 'envelope-id',
        name: 'Test Envelope',
        amount: 1000,
        user: mockUser,
        month: 1,
        year: 2024,
        icone: '1F4B0',
      };

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockEnvelopeRepository.create.mockReturnValue(mockEnvelope);
      mockEnvelopeRepository.save.mockResolvedValue(mockEnvelope);

      const result = await service.create('Test Envelope', 1000, 1, 1, 2024, '💰');

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockEnvelopeRepository.create).toHaveBeenCalledWith({
        name: 'Test Envelope',
        amount: 1000,
        user: mockUser,
        month: 1,
        year: 2024,
        icone: '1F4B0',
      });
      expect(result).toEqual(mockEnvelope);
    });

    it('should handle emoji encoding correctly', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };
      const mockEnvelope = { id: 'envelope-id' };

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockEnvelopeRepository.create.mockReturnValue(mockEnvelope);
      mockEnvelopeRepository.save.mockResolvedValue(mockEnvelope);

      await service.create('Test', 1000, 1, 1, 2024, '🏠');

      expect(mockEnvelopeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          icone: '1F3E0',
        }),
      );
    });

    it('should handle empty icon', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };
      const mockEnvelope = { id: 'envelope-id' };

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockEnvelopeRepository.create.mockReturnValue(mockEnvelope);
      mockEnvelopeRepository.save.mockResolvedValue(mockEnvelope);

      await service.create('Test', 1000, 1, 1, 2024, '');

      expect(mockEnvelopeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          icone: '',
        }),
      );
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when envelope not found', async () => {
      mockEnvelopeRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', 'Updated Name'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update envelope successfully', async () => {
      const mockEnvelope = {
        id: 'envelope-id',
        name: 'Original Name',
        amount: 1000,
        icone: 'OLD',
      };

      const updatedEnvelope = {
        ...mockEnvelope,
        name: 'Updated Name',
        amount: 1500,
        icone: '1F4B0',
      };

      mockEnvelopeRepository.findOneBy.mockResolvedValue(mockEnvelope);
      mockEnvelopeRepository.save.mockResolvedValue(updatedEnvelope);

      const result = await service.update('envelope-id', 'Updated Name', 1500, '💰');

      expect(mockEnvelope.name).toBe('Updated Name');
      expect(mockEnvelope.amount).toBe(1500);
      expect(mockEnvelope.icone).toBe('1F4B0');
      expect(mockEnvelopeRepository.save).toHaveBeenCalledWith(mockEnvelope);
      expect(result).toEqual(updatedEnvelope);
    });

    it('should update only name when amount not provided', async () => {
      const mockEnvelope = {
        id: 'envelope-id',
        name: 'Original Name',
        amount: 1000,
        icone: 'OLD',
      };

      mockEnvelopeRepository.findOneBy.mockResolvedValue(mockEnvelope);
      mockEnvelopeRepository.save.mockResolvedValue(mockEnvelope);

      await service.update('envelope-id', 'Updated Name');

      expect(mockEnvelope.name).toBe('Updated Name');
      expect(mockEnvelope.amount).toBe(1000);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when envelope not found', async () => {
      mockEnvelopeRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.delete('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete envelope successfully', async () => {
      mockEnvelopeRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete('envelope-id');

      expect(mockEnvelopeRepository.delete).toHaveBeenCalledWith('envelope-id');
    });
  });

  describe('findByUserAndMonth', () => {
    it('should return envelopes for user and month', async () => {
      const mockEnvelopes = [
        {
          id: '1',
          name: 'Envelope A',
          amount: 1000,
          month: 1,
          year: 2024,
        },
        {
          id: '2',
          name: 'Envelope B',
          amount: 500,
          month: 1,
          year: 2024,
        },
      ];

      mockEnvelopeRepository.find.mockResolvedValue(mockEnvelopes);

      const result = await service.findByUserAndMonth(1, 1, 2024);

      expect(mockEnvelopeRepository.find).toHaveBeenCalledWith({
        where: {
          user: { id: 1 },
          month: 1,
          year: 2024,
        },
        relations: ['transactions'],
        order: { name: 'ASC' },
      });
      expect(result).toEqual(mockEnvelopes);
    });
  });
});
