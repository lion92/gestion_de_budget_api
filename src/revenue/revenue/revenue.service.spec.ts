import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RevenueService } from './revenue.service';
import { Revenue } from '../../entity/revenue.entity';
import { RevenueDto } from '../../dto/Revenue.dto';
import { NotFoundException } from '@nestjs/common';

describe('RevenueService', () => {
  let service: RevenueService;
  let repository: Repository<Revenue>;

  const mockRevenueRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueService,
        {
          provide: getRepositoryToken(Revenue),
          useValue: mockRevenueRepository,
        },
      ],
    }).compile();

    service = module.get<RevenueService>(RevenueService);
    repository = module.get<Repository<Revenue>>(getRepositoryToken(Revenue));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new revenue entry', async () => {
      const revenueDto: RevenueDto = { amount: 100, date: new Date().toISOString(), name: 'Salary' }; // Fixed date and removed description
      const userId = 1;
      const createdRevenue = { id: 1, ...revenueDto, user: { id: userId } };

      mockRevenueRepository.create.mockReturnValue(createdRevenue);
      mockRevenueRepository.save.mockResolvedValue(createdRevenue);

      const result = await service.create(revenueDto, userId);
      expect(repository.create).toHaveBeenCalledWith({ ...revenueDto, user: { id: userId } });
      expect(repository.save).toHaveBeenCalledWith(createdRevenue);
      expect(result).toEqual(createdRevenue);
    });
  });

  describe('findAll', () => {
    it('should return all revenues for a user', async () => {
      const userId = 1;
      const revenues = [{ id: 1, amount: 100 }];
      mockRevenueRepository.find.mockResolvedValue(revenues);

      const result = await service.findAll(userId);
      expect(repository.find).toHaveBeenCalledWith({
        where: { user: { id: userId } },
        order: { date: 'DESC' },
      });
      expect(result).toEqual(revenues);
    });
  });

  describe('update', () => {
    it('should update an existing revenue entry', async () => {
      const revenueId = 1;
      const userId = 1;
      const revenueDto: RevenueDto = { amount: 150, date: new Date().toISOString(), name: 'Bonus' }; // Fixed date and removed description
      const existingRevenue = { id: revenueId, amount: 100, name: 'Salary', user: { id: userId } }; // Fixed name
      const updatedRevenue = { ...existingRevenue, ...revenueDto };

      mockRevenueRepository.findOne.mockResolvedValue(existingRevenue);
      mockRevenueRepository.save.mockResolvedValue(updatedRevenue);

      const result = await service.update(revenueId, revenueDto, userId);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: revenueId, user: { id: userId } } });
      expect(repository.save).toHaveBeenCalledWith(updatedRevenue);
      expect(result).toEqual(updatedRevenue);
    });

    it('should throw NotFoundException if revenue not found during update', async () => {
      const revenueId = 1;
      const userId = 1;
      const revenueDto: RevenueDto = { amount: 150, date: new Date().toISOString(), name: 'Bonus' }; // Fixed date and removed description
      mockRevenueRepository.findOne.mockResolvedValue(null);

      await expect(service.update(revenueId, revenueDto, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove an existing revenue entry', async () => {
      const revenueId = 1;
      const userId = 1;
      const existingRevenue = { id: revenueId, amount: 100, name: 'Salary', user: { id: userId } }; // Fixed name

      mockRevenueRepository.findOne.mockResolvedValue(existingRevenue);
      mockRevenueRepository.remove.mockResolvedValue(existingRevenue);

      const result = await service.remove(revenueId, userId);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: revenueId, user: { id: userId } } });
      expect(repository.remove).toHaveBeenCalledWith(existingRevenue);
      expect(result).toEqual(existingRevenue);
    });

    it('should throw NotFoundException if revenue not found during remove', async () => {
      const revenueId = 1;
      const userId = 1;
      mockRevenueRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(revenueId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a single revenue entry', async () => {
      const revenueId = 1;
      const userId = 1;
      const existingRevenue = { id: revenueId, amount: 100, name: 'Salary', user: { id: userId } }; // Fixed name
      mockRevenueRepository.findOne.mockResolvedValue(existingRevenue);

      const result = await service.findOne(revenueId, userId);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: revenueId, user: { id: userId } } });
      expect(result).toEqual(existingRevenue);
    });

    it('should throw NotFoundException if revenue not found', async () => {
      const revenueId = 1;
      const userId = 1;
      mockRevenueRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(revenueId, userId)).rejects.toThrow(NotFoundException);
    });
  });
});