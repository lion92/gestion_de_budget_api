import { Test, TestingModule } from '@nestjs/testing'; // Added Test and TestingModule
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Request,
  Headers,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import {
  RevenueService
} from './revenue.service';

import {
  JwtService
} from '@nestjs/jwt';
import {
  RevenueDto
} from '../../dto/Revenue.dto';
import { RevenueController } from './revenue.controller'; // Import RevenueController

describe('RevenueController', () => {
  let controller: RevenueController; // Changed type back to RevenueController
  let revenueService: RevenueService;
  let jwtService: JwtService;

  const mockRevenueService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RevenueController], // Changed to RevenueController
      providers: [{
        provide: RevenueService,
        useValue: mockRevenueService,
      }, {
        provide: JwtService,
        useValue: mockJwtService,
      }, ],
    }).compile();

    controller = module.get < RevenueController > (RevenueController); // Changed to RevenueController
    revenueService = module.get < RevenueService > (RevenueService);
    jwtService = module.get < JwtService > (JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  const mockAuthHeader = 'Bearer valid_jwt_token';
  const mockUserId = 1;

  // Helper to mock getUserIdFromToken
  const setupAuthMock = (userId: number | null, throwError: boolean = false) => {
    if (throwError) {
      mockJwtService.verifyAsync.mockRejectedValue(new UnauthorizedException('Token manquant ou invalide'));
    } else {
      mockJwtService.verifyAsync.mockResolvedValue({ id: userId });
    }
  };

  describe('create', () => {
    it('should create a revenue entry', async () => {
      setupAuthMock(mockUserId);
      const revenueDto: RevenueDto = {
        amount: 100,
        date: new Date().toISOString(),
        name: 'Test Revenue'
      }; // Fixed date and removed description
      const createdRevenue = {
        id: 1,
        ...revenueDto,
        user: {
          id: mockUserId
        }
      };
      mockRevenueService.create.mockResolvedValue(createdRevenue);

      const result = await controller.create(revenueDto, mockAuthHeader);
      expect(revenueService.create).toHaveBeenCalledWith(revenueDto, mockUserId);
      expect(result).toEqual(createdRevenue);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      setupAuthMock(null, true);
      const revenueDto: RevenueDto = {
        amount: 100,
        date: new Date().toISOString(),
        name: 'Test Revenue'
      };
      await expect(controller.create(revenueDto, 'Bearer invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(revenueService.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all revenues for a user', async () => {
      setupAuthMock(mockUserId);
      const revenues = [{
        id: 1,
        amount: 100
      }];
      mockRevenueService.findAll.mockResolvedValue(revenues);

      const result = await controller.findAll(mockAuthHeader);
      expect(revenueService.findAll).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(revenues);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      setupAuthMock(null, true);
      await expect(controller.findAll('Bearer invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(revenueService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a revenue entry', async () => {
      setupAuthMock(mockUserId);
      const revenueId = 1;
      const revenueDto: RevenueDto = {
        amount: 150,
        date: new Date().toISOString(),
        name: 'Updated'
      };
      const updatedRevenue = {
        id: revenueId,
        ...revenueDto,
        user: {
          id: mockUserId
        }
      };
      mockRevenueService.update.mockResolvedValue(updatedRevenue);

      const result = await controller.update(revenueId, revenueDto, mockAuthHeader);
      expect(revenueService.update).toHaveBeenCalledWith(revenueId, revenueDto, mockUserId);
      expect(result).toEqual(updatedRevenue);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      setupAuthMock(null, true);
      const revenueDto: RevenueDto = {
        amount: 150,
        date: new Date().toISOString(),
        name: 'Updated'
      };
      await expect(controller.update(1, revenueDto, 'Bearer invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(revenueService.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a revenue entry', async () => {
      setupAuthMock(mockUserId);
      const revenueId = 1;
      mockRevenueService.remove.mockResolvedValue(undefined);

      await controller.remove(revenueId, mockAuthHeader);
      expect(revenueService.remove).toHaveBeenCalledWith(revenueId, mockUserId);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      setupAuthMock(null, true);
      await expect(controller.remove(1, 'Bearer invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(revenueService.remove).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single revenue entry', async () => {
      setupAuthMock(mockUserId);
      const revenueId = 1;
      const foundRevenue = {
        id: revenueId,
        amount: 100,
        name: 'Test',
        user: {
          id: mockUserId
        }
      };
      mockRevenueService.findOne.mockResolvedValue(foundRevenue);

      const result = await controller.findOne(revenueId, mockAuthHeader);
      expect(revenueService.findOne).toHaveBeenCalledWith(revenueId, mockUserId);
      expect(result).toEqual(foundRevenue);
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      setupAuthMock(null, true);
      await expect(controller.findOne(1, 'Bearer invalid_token')).rejects.toThrow(UnauthorizedException);
      expect(revenueService.findOne).not.toHaveBeenCalled();
    });
  });
});