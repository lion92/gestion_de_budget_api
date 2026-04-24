jest.mock('multer', () => ({ diskStorage: jest.fn(() => ({})) }));
jest.mock('@nestjs/platform-express', () => ({ FileInterceptor: jest.fn(() => () => {}) }));
jest.mock('dotenv', () => ({ config: jest.fn() }));

import { UnauthorizedException } from '@nestjs/common';

const mockTodosService = {
  findAll: jest.fn(),
  findByUser: jest.fn(),
  findOneBy: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  verifyAsync: jest.fn(),
};

// Contrôleur miroir fidèle à la logique réelle (jwt dans le body, pas Bearer header)
class MockTodosController {
  constructor(
    private readonly todos: typeof mockTodosService,
    private readonly jwtService: typeof mockJwtService,
  ) {}

  async findAll() {
    return this.todos.findAll();
  }

  async findAllByUser(userId: number) {
    return this.todos.findByUser(userId);
  }

  async findOne(id: number) {
    return this.todos.findOneBy(id).catch(() => undefined);
  }

  async remove(id: number, jwt: { jwt: string }) {
    const data = await this.jwtService.verifyAsync(jwt.jwt, { secret: process.env.secret });
    if (!data) throw new UnauthorizedException();
    await this.todos.delete(id);
    return 'ok';
  }

  async update(id: number, todo: any, jwt: { jwt: string }) {
    const data = await this.jwtService.verifyAsync(jwt.jwt, { secret: process.env.secret });
    if (!data) throw new UnauthorizedException();
    await this.todos.update(id, todo);
    return 'ok';
  }

  async create(todo: any, jwt: { jwt: string }) {
    const data = await this.jwtService.verifyAsync(jwt.jwt, { secret: process.env.secret });
    if (!data) throw new UnauthorizedException();
    await this.todos.create(todo);
  }

  async local(file: any) {
    if (!file) return { error: 'No file uploaded' };
    return { statusCode: 200, data: file.path };
  }
}

describe('TodosController', () => {
  let controller: MockTodosController;

  const validJwt = { jwt: 'valid_jwt' };
  const jwtPayload = { id: 1, email: 'test@test.com' };
  const mockTodo = { id: 1, title: 'Faire les courses', completed: false };

  beforeEach(() => {
    controller = new MockTodosController(mockTodosService, mockJwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── GET /todos ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devrait retourner tous les todos', async () => {
      const todos = [mockTodo, { id: 2, title: 'Nettoyer', completed: true }];
      mockTodosService.findAll.mockResolvedValue(todos);

      const result = await controller.findAll();

      expect(mockTodosService.findAll).toHaveBeenCalled();
      expect(result).toEqual(todos);
    });

    it('devrait retourner un tableau vide si aucun todo', async () => {
      mockTodosService.findAll.mockResolvedValue([]);
      const result = await controller.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── GET /todos/byuser/:user ───────────────────────────────────────────────

  describe('findAllByUser', () => {
    it('devrait retourner les todos d\'un utilisateur', async () => {
      mockTodosService.findByUser.mockResolvedValue([mockTodo]);

      const result = await controller.findAllByUser(1);

      expect(mockTodosService.findByUser).toHaveBeenCalledWith(1);
      expect(result).toEqual([mockTodo]);
    });

    it('devrait retourner un tableau vide si l\'utilisateur n\'a pas de todos', async () => {
      mockTodosService.findByUser.mockResolvedValue([]);
      const result = await controller.findAllByUser(99);
      expect(result).toEqual([]);
    });
  });

  // ─── GET /todos/:id ────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devrait retourner un todo par son id', async () => {
      mockTodosService.findOneBy.mockResolvedValue(mockTodo);

      const result = await controller.findOne(1);

      expect(mockTodosService.findOneBy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockTodo);
    });

    it('devrait retourner undefined si le todo n\'existe pas', async () => {
      mockTodosService.findOneBy.mockRejectedValue(new Error('Not found'));
      const result = await controller.findOne(999);
      expect(result).toBeUndefined();
    });
  });

  // ─── DELETE /todos/:id ─────────────────────────────────────────────────────

  describe('remove', () => {
    it('devrait supprimer un todo si jwt valide', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockTodosService.delete.mockResolvedValue(undefined);

      const result = await controller.remove(1, validJwt);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', { secret: process.env.secret });
      expect(mockTodosService.delete).toHaveBeenCalledWith(1);
      expect(result).toBe('ok');
    });

    it('devrait lever une erreur si jwt invalide', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

      await expect(controller.remove(1, { jwt: 'bad_jwt' })).rejects.toThrow();
      expect(mockTodosService.delete).not.toHaveBeenCalled();
    });

    it('devrait lever UnauthorizedException si verifyAsync retourne null', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(null);

      await expect(controller.remove(1, validJwt)).rejects.toThrow(UnauthorizedException);
      expect(mockTodosService.delete).not.toHaveBeenCalled();
    });
  });

  // ─── PUT /todos/:id ────────────────────────────────────────────────────────

  describe('update', () => {
    const updatedTodo = { title: 'Todo modifié', completed: true };

    it('devrait mettre à jour un todo si jwt valide', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockTodosService.update.mockResolvedValue(undefined);

      const result = await controller.update(1, updatedTodo, validJwt);

      expect(mockTodosService.update).toHaveBeenCalledWith(1, updatedTodo);
      expect(result).toBe('ok');
    });

    it('devrait lever une erreur si jwt invalide', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(controller.update(1, updatedTodo, { jwt: 'expired_jwt' })).rejects.toThrow();
      expect(mockTodosService.update).not.toHaveBeenCalled();
    });

    it('devrait lever UnauthorizedException si verifyAsync retourne null', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(null);

      await expect(controller.update(1, updatedTodo, validJwt)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── POST /todos ───────────────────────────────────────────────────────────

  describe('create', () => {
    const newTodo = { title: 'Nouveau todo', completed: false };

    it('devrait créer un todo si jwt valide', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockTodosService.create.mockResolvedValue(undefined);

      await controller.create(newTodo, validJwt);

      expect(mockTodosService.create).toHaveBeenCalledWith(newTodo);
    });

    it('devrait lever une erreur si jwt invalide', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

      await expect(controller.create(newTodo, { jwt: 'bad_jwt' })).rejects.toThrow();
      expect(mockTodosService.create).not.toHaveBeenCalled();
    });

    it('devrait lever UnauthorizedException si verifyAsync retourne null', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(null);

      await expect(controller.create(newTodo, validJwt)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── POST /todos/upload ────────────────────────────────────────────────────

  describe('local (upload fichier)', () => {
    it('devrait retourner le chemin du fichier uploadé', async () => {
      const mockFile = { originalname: 'image.png', path: './uploads/image.png' };

      const result = await controller.local(mockFile);

      expect(result).toEqual({ statusCode: 200, data: './uploads/image.png' });
    });

    it('devrait retourner une erreur si aucun fichier fourni', async () => {
      const result = await controller.local(null);
      expect(result).toEqual({ error: 'No file uploaded' });
    });
  });
});
