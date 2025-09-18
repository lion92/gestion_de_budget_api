import { Test, TestingModule } from '@nestjs/testing';
import { TodosService } from './todos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../entity/todo.entity';
import { TodoDTO } from '../dto/todoDTO';
import { UserDTO } from '../dto/UserDTO'; // Import UserDTO

describe('TodosService', () => {
  let service: TodosService;
  let repository: Repository<Todo>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getSql: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockTodoRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodosService,
        {
          provide: getRepositoryToken(Todo),
          useValue: mockTodoRepository,
        },
      ],
    }).compile();

    service = module.get<TodosService>(TodosService);
    repository = module.get<Repository<Todo>>(getRepositoryToken(Todo));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of todos', async () => {
      const result = [{ id: 1, title: 'Test Todo' }];
      mockTodoRepository.find.mockResolvedValue(result);
      expect(await service.findAll()).toEqual(result);
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOneBy', () => {
    it('should return a single todo', async () => {
      const result = { id: 1, title: 'Test Todo' };
      mockTodoRepository.findOne.mockResolvedValue(result);
      expect(await service.findOneBy(1)).toEqual(result);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['user'],
      });
    });

    it('should return null if todo not found', async () => {
      mockTodoRepository.findOne.mockResolvedValue(null);
      expect(await service.findOneBy(999)).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a todo', async () => {
      mockTodoRepository.delete.mockResolvedValue({ affected: 1 });
      await service.delete(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new todo', async () => {
      const mockUserDTO: UserDTO = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true };
      const todoDTO: TodoDTO = { title: 'New Todo', description: 'Desc', user: mockUserDTO }; // Used mockUserDTO
      const newTodo = { id: 1, ...todoDTO };
      mockTodoRepository.create.mockReturnValue(newTodo);
      mockTodoRepository.save.mockResolvedValue(newTodo);

      const result = await service.create(todoDTO);
      expect(repository.create).toHaveBeenCalledWith(todoDTO);
      expect(repository.save).toHaveBeenCalledWith(newTodo);
      expect(result).toEqual(newTodo);
    });
  });

  describe('update', () => {
    it('should update an existing todo', async () => {
      const mockUserDTO: UserDTO = { id: 1, email: 'test@test.com', password: 'hashed', nom: 'Test', prenom: 'User', isEmailVerified: true };
      const todoDTO: TodoDTO = { title: 'Updated Todo', description: 'Updated Desc', user: mockUserDTO }; // Used mockUserDTO
      mockTodoRepository.update.mockResolvedValue({ affected: 1 });
      await service.update(1, todoDTO);
      expect(repository.update).toHaveBeenCalledWith(1, {
        title: todoDTO.title,
        description: todoDTO.description,
        user: todoDTO.user,
      });
    });
  });

  describe('findByUser', () => {
    it('should return todos for a given user', async () => {
      const userId = 1;
      const result = [{ id: 1, title: 'User Todo', userId: 1 }];
      mockQueryBuilder.execute.mockResolvedValue(result);

      expect(await service.findByUser(userId)).toEqual(result);
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('tache');
      expect(mockQueryBuilder.select).toHaveBeenCalled();
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith('tache.user', 'user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('user.id = :userId', { userId });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('tache.createdAt', 'DESC');
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });
});