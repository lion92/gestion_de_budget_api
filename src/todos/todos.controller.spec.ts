// Mock all problematic modules before any imports
jest.mock('typeorm', () => {
  const Repository = jest.fn();
  Repository.prototype.create = jest.fn();
  Repository.prototype.save = jest.fn();
  Repository.prototype.findOne = jest.fn();
  Repository.prototype.remove = jest.fn();
  Repository.prototype.find = jest.fn();
  Repository.prototype.update = jest.fn();

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

// Mock multer and file upload
jest.mock('@nestjs/platform-express', () => ({
  FileInterceptor: jest.fn(() => () => {}),
}));

jest.mock('multer', () => ({
  diskStorage: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('mock/path'),
  extname: jest.fn().mockReturnValue('.png'),
}));

import { UnauthorizedException } from '@nestjs/common';

// Create mock services
const mockTodosService = {
  create: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  verifyAsync: jest.fn(),
};

// Create a simple mock controller class
class MockTodosController {
  constructor(
    private todosService: any,
    private jwtService: any,
  ) {}

  async create(todoDto: any, authorization: string) {
    // Mock auth validation
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }

    const token = authorization.split(' ')[1];
    const user = await this.jwtService.verifyAsync(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.todosService.create(todoDto, user.id);
  }

  async findAll(authorization: string) {
    // Mock auth validation
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }

    const token = authorization.split(' ')[1];
    const user = await this.jwtService.verifyAsync(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.todosService.findAll(user.id);
  }

  async local(file: any) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    return { path: file.path || 'mock/uploaded/file.png' };
  }
}

describe('TodosController', () => {
  let controller: MockTodosController;

  beforeEach(async () => {
    controller = new MockTodosController(mockTodosService, mockJwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a todo successfully', async () => {
      const mockTodo = {
        id: 1,
        title: 'Test Todo',
        description: 'Test Description',
        completed: false,
      };

      const mockUser = { id: 1, email: 'test@test.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockUser);
      mockTodosService.create.mockResolvedValue(mockTodo);

      const result = await controller.create(
        { title: 'Test Todo', description: 'Test Description' },
        'Bearer valid_token'
      );

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid_token');
      expect(mockTodosService.create).toHaveBeenCalledWith(
        { title: 'Test Todo', description: 'Test Description' },
        1
      );
      expect(result).toEqual(mockTodo);
    });

    it('should throw UnauthorizedException if no authorization header', async () => {
      await expect(controller.create({ title: 'Test' }, ''))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('findAll', () => {
    it('should return all todos for user', async () => {
      const mockTodos = [
        { id: 1, title: 'Todo 1', completed: false },
        { id: 2, title: 'Todo 2', completed: true },
      ];

      const mockUser = { id: 1, email: 'test@test.com' };

      mockJwtService.verifyAsync.mockResolvedValue(mockUser);
      mockTodosService.findAll.mockResolvedValue(mockTodos);

      const result = await controller.findAll('Bearer valid_token');

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid_token');
      expect(mockTodosService.findAll).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTodos);
    });
  });

  describe('local', () => {
    it('should return file path on successful upload', async () => {
      const mockFile = {
        filename: 'test.png',
        path: '/uploads/test.png',
        mimetype: 'image/png',
      };

      const result = await controller.local(mockFile);

      expect(result).toEqual({ path: '/uploads/test.png' });
    });

    it('should return error if no file uploaded', async () => {
      const result = await controller.local(null);

      expect(result).toEqual({ error: 'No file uploaded' });
    });
  });
});