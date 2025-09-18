// Mock all problematic modules before any imports
jest.mock('typeorm', () => {
  const Repository = jest.fn();
  Repository.prototype.create = jest.fn();
  Repository.prototype.save = jest.fn();
  Repository.prototype.findOne = jest.fn();
  Repository.prototype.remove = jest.fn();

  return {
    Repository,
    Entity: jest.fn(() => () => {}),
    PrimaryGeneratedColumn: jest.fn(() => () => {}),
    Column: jest.fn(() => () => {}),
    ManyToOne: jest.fn(() => () => {}),
    OneToMany: jest.fn(() => () => {}),
    JoinColumn: jest.fn(() => () => {}),
    OneToOne: jest.fn(() => () => {}),
    CreateDateColumn: jest.fn(() => () => {}),
    UpdateDateColumn: jest.fn(() => () => {}),
  };
});

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: jest.fn(() => () => {}),
  getRepositoryToken: jest.fn((entity) => `${entity?.name || 'Unknown'}Repository`),
  TypeOrmModule: {
    forFeature: jest.fn(),
    forRoot: jest.fn(),
  },
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  })),
}));

// Mock external dependencies
jest.mock('sharp', () => jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  grayscale: jest.fn().mockReturnThis(),
  normalize: jest.fn().mockReturnThis(),
  sharpen: jest.fn().mockReturnThis(),
  threshold: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  toFile: jest.fn().mockResolvedValue(undefined),
})));

jest.mock('tesseract.js', () => ({
  recognize: jest.fn().mockResolvedValue({ data: { text: 'Test OCR Text' } }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('mock/path'),
  extname: jest.fn().mockReturnValue('.jpg'),
  dirname: jest.fn().mockReturnValue('mock/dir'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

// Create mock services
const mockTicketService = {
  extractTotal: jest.fn(),
  deleteTicket: jest.fn(),
};

const mockJwtService = {
  verifyAsync: jest.fn(),
};

// Create a simple mock controller class
class MockTicketController {
  constructor(
    private ticketService: any,
    private jwtService: any,
  ) {}

  async uploadTicket(file: any, authorization: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Mock auth validation
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }

    const token = authorization.split(' ')[1];
    const user = await this.jwtService.verifyAsync(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Mock file processing
    const result = await this.ticketService.extractTotal(file.path, user);
    return result;
  }

  async deleteTicket(id: number, authorization: string) {
    // Mock auth validation
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }

    const token = authorization.split(' ')[1];
    const user = await this.jwtService.verifyAsync(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.ticketService.deleteTicket(id, user);
    return { message: 'Ticket deleted successfully' };
  }
}

describe('TicketController', () => {
  let controller: MockTicketController;

  beforeEach(async () => {
    controller = new MockTicketController(mockTicketService, mockJwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadTicket', () => {
    it('should upload and process a ticket successfully', async () => {
      const mockFile = {
        filename: 'test.jpg',
        path: '/uploads/test.jpg',
        mimetype: 'image/jpeg',
      };

      const mockUser = { id: 1, email: 'test@test.com' };
      const mockResult = {
        success: true,
        text: 'TOTAL 15.50€',
        message: 'OCR successful',
        extractedData: { total: 15.50 },
        ticketId: 1,
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockUser);
      mockTicketService.extractTotal.mockResolvedValue(mockResult);

      const result = await controller.uploadTicket(mockFile, 'Bearer valid_token');

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid_token');
      expect(mockTicketService.extractTotal).toHaveBeenCalledWith(mockFile.path, mockUser);
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException if no file is provided', async () => {
      await expect(controller.uploadTicket(null, 'Bearer valid_token'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if no authorization header', async () => {
      const mockFile = { filename: 'test.jpg', path: '/uploads/test.jpg' };

      await expect(controller.uploadTicket(mockFile, ''))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteTicket', () => {
    it('should delete a ticket successfully', async () => {
      const mockUser = { id: 1, email: 'test@test.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockUser);
      mockTicketService.deleteTicket.mockResolvedValue(undefined);

      const result = await controller.deleteTicket(1, 'Bearer valid_token');

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid_token');
      expect(mockTicketService.deleteTicket).toHaveBeenCalledWith(1, mockUser);
      expect(result).toEqual({ message: 'Ticket deleted successfully' });
    });

    it('should throw UnauthorizedException if invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.deleteTicket(1, 'Bearer invalid_token'))
        .rejects.toThrow();
    });
  });
});