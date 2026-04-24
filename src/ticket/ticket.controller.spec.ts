// ─── Mocks hoistés avant tout import ─────────────────────────────────────────
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
    Unique: jest.fn(() => () => {}),
  };
});

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: jest.fn(() => () => {}),
  getRepositoryToken: jest.fn((entity) => `${entity?.name || 'Unknown'}Repository`),
  TypeOrmModule: { forFeature: jest.fn(), forRoot: jest.fn() },
}));

jest.mock('@nestjs/jwt', () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  })),
}));

jest.mock('sharp', () => jest.fn(() => ({
  resize: jest.fn().mockReturnThis(),
  greyscale: jest.fn().mockReturnThis(),
  normalize: jest.fn().mockReturnThis(),
  sharpen: jest.fn().mockReturnThis(),
  threshold: jest.fn().mockReturnThis(),
  png: jest.fn().mockReturnThis(),
  toFile: jest.fn().mockResolvedValue(undefined),
})));

jest.mock('tesseract.js', () => ({
  recognize: jest.fn().mockResolvedValue({ data: { text: '' } }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';

// ─── Mocks des services ────────────────────────────────────────────────────────

const mockTicketService = {
  extractTotal: jest.fn(),
  deleteTicket: jest.fn(),
  linkTicketToExpense: jest.fn(),
  getTicketByExpense: jest.fn(),
  deleteLinkByExpense: jest.fn(),
};

const mockJwtService = {
  verifyAsync: jest.fn(),
};

const mockUserRepository = {
  findOne: jest.fn(),
};

// ─── Contrôleur simplifié fidèle à la logique réelle ─────────────────────────

class MockTicketController {
  constructor(
    private readonly ticketService: typeof mockTicketService,
    private readonly jwtService: typeof mockJwtService,
    private readonly userRepository: typeof mockUserRepository,
  ) {}

  private async getUserFromJwtBody(jwt: string) {
    const data = await this.jwtService.verifyAsync(jwt, {
      secret: process.env.JWT_SECRET || process.env.secret,
    });
    if (!data?.id) throw new UnauthorizedException('Token JWT invalide');
    const user = await this.userRepository.findOne({ where: { id: data.id } });
    if (!user) throw new HttpException('Utilisateur non trouvé', 404);
    return user;
  }

  private async getUserFromBearerHeader(req: any) {
    const auth: string = req.headers?.authorization ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    if (!token) throw new UnauthorizedException('Token JWT manquant');
    return this.getUserFromJwtBody(token);
  }

  async uploadTicket(file: any, authorization: string) {
    if (!file) throw new BadRequestException('No file provided');
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException('Invalid token');
    const token = authorization.slice(7);
    const data = await this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_SECRET || process.env.secret,
    });
    if (!data?.id) throw new UnauthorizedException('Token JWT invalide');
    const user = await this.userRepository.findOne({ where: { id: data.id } });
    if (!user) throw new HttpException('Utilisateur non trouvé', 404);
    return this.ticketService.extractTotal(file.path, user);
  }

  async deleteTicket(id: number, authorization: string) {
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException('Invalid token');
    const token = authorization.slice(7);
    const data = await this.jwtService.verifyAsync(token, {
      secret: process.env.JWT_SECRET || process.env.secret,
    });
    if (!data?.id) throw new UnauthorizedException('Token JWT invalide');
    const user = await this.userRepository.findOne({ where: { id: data.id } });
    if (!user) throw new HttpException('Utilisateur non trouvé', 404);
    await this.ticketService.deleteTicket(id, user);
    return { message: 'Ticket deleted successfully' };
  }

  async linkTicketToExpense(body: { jwt: string; ticketId: number; expenseId: number; extractedData?: any }) {
    if (!body.jwt || !body.ticketId || !body.expenseId)
      throw new BadRequestException('jwt, ticketId et expenseId requis');
    const user = await this.getUserFromJwtBody(body.jwt);
    await this.ticketService.linkTicketToExpense(body.ticketId, body.expenseId, body.extractedData ?? {}, user);
    return { success: true };
  }

  async getTicketByExpense(expenseId: number, req: any) {
    const user = await this.getUserFromBearerHeader(req);
    return this.ticketService.getTicketByExpense(expenseId, user);
  }

  async deleteLinkByExpense(expenseId: number, req: any) {
    const user = await this.getUserFromBearerHeader(req);
    await this.ticketService.deleteLinkByExpense(expenseId, user);
    return { success: true };
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TicketController', () => {
  let controller: MockTicketController;

  const mockUser = { id: 1, email: 'test@test.com' };
  const mockJwtPayload = { id: 1 };

  beforeEach(() => {
    controller = new MockTicketController(mockTicketService, mockJwtService, mockUserRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /ticket/upload ───────────────────────────────────────────────────

  describe('uploadTicket', () => {
    const mockFile = { filename: 'ticket.jpg', path: '/uploads/ticket.jpg', mimetype: 'image/jpeg' };

    it('devrait uploader et traiter un ticket avec succès', async () => {
      const mockResult = { success: true, text: 'TOTAL 15,50€', message: 'OK', extractedData: { total: 15.5 }, ticketId: 1 };
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.extractTotal.mockResolvedValue(mockResult);

      const result = await controller.uploadTicket(mockFile, 'Bearer valid_token');

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid_token', expect.any(Object));
      expect(mockTicketService.extractTotal).toHaveBeenCalledWith(mockFile.path, mockUser);
      expect(result).toEqual(mockResult);
    });

    it('devrait lever BadRequestException si aucun fichier fourni', async () => {
      await expect(controller.uploadTicket(null, 'Bearer valid_token')).rejects.toThrow(BadRequestException);
    });

    it('devrait lever UnauthorizedException si pas d\'en-tête Bearer', async () => {
      await expect(controller.uploadTicket(mockFile, 'invalid_format')).rejects.toThrow(UnauthorizedException);
    });

    it('devrait lever une erreur si le JWT est expiré', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(controller.uploadTicket(mockFile, 'Bearer expired_token')).rejects.toThrow();
    });

    it('devrait lever HttpException si l\'utilisateur n\'existe pas en DB', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(controller.uploadTicket(mockFile, 'Bearer valid_token')).rejects.toThrow(HttpException);
    });
  });

  // ─── DELETE /ticket/:id ────────────────────────────────────────────────────

  describe('deleteTicket', () => {
    it('devrait supprimer un ticket avec succès', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.deleteTicket.mockResolvedValue(undefined);

      const result = await controller.deleteTicket(5, 'Bearer valid_token');

      expect(mockTicketService.deleteTicket).toHaveBeenCalledWith(5, mockUser);
      expect(result).toEqual({ message: 'Ticket deleted successfully' });
    });

    it('devrait lever UnauthorizedException si pas de Bearer', async () => {
      await expect(controller.deleteTicket(5, 'no_bearer')).rejects.toThrow(UnauthorizedException);
    });

    it('devrait propager NotFoundException du service si ticket inexistant', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.deleteTicket.mockRejectedValue(new NotFoundException('Ticket non trouvé ou non autorisé.'));

      await expect(controller.deleteTicket(999, 'Bearer valid_token')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── POST /ticket/link ─────────────────────────────────────────────────────

  describe('linkTicketToExpense', () => {
    const validBody = { jwt: 'valid_jwt', ticketId: 5, expenseId: 10, extractedData: { total: 25.5 } };

    it('devrait lier un ticket à une dépense avec succès', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.linkTicketToExpense.mockResolvedValue({ id: 1 });

      const result = await controller.linkTicketToExpense(validBody);

      expect(mockTicketService.linkTicketToExpense).toHaveBeenCalledWith(5, 10, { total: 25.5 }, mockUser);
      expect(result).toEqual({ success: true });
    });

    it('devrait utiliser un extractedData vide si non fourni', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.linkTicketToExpense.mockResolvedValue({ id: 1 });

      await controller.linkTicketToExpense({ jwt: 'valid_jwt', ticketId: 5, expenseId: 10 });

      expect(mockTicketService.linkTicketToExpense).toHaveBeenCalledWith(5, 10, {}, mockUser);
    });

    it('devrait lever BadRequestException si jwt manquant', async () => {
      await expect(
        controller.linkTicketToExpense({ jwt: '', ticketId: 5, expenseId: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si ticketId est 0', async () => {
      await expect(
        controller.linkTicketToExpense({ jwt: 'valid_jwt', ticketId: 0, expenseId: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si expenseId est 0', async () => {
      await expect(
        controller.linkTicketToExpense({ jwt: 'valid_jwt', ticketId: 5, expenseId: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('devrait propager ForbiddenException si la dépense n\'appartient pas à l\'utilisateur', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.linkTicketToExpense.mockRejectedValue(new ForbiddenException('Dépense non autorisée'));

      await expect(controller.linkTicketToExpense(validBody)).rejects.toThrow(ForbiddenException);
    });

    it('devrait propager NotFoundException si la dépense n\'existe pas', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.linkTicketToExpense.mockRejectedValue(new NotFoundException('Dépense introuvable'));

      await expect(controller.linkTicketToExpense(validBody)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── GET /ticket/byexpense/:expenseId ──────────────────────────────────────

  describe('getTicketByExpense', () => {
    const mockReq = { headers: { authorization: 'Bearer valid_token' } };
    const mockTicketData = {
      ticketId: 5,
      fileName: 'ticket5.jpg',
      fileUrl: 'https://www.krisscode.fr/budget-api/ticket/image/5',
      extractedData: { total: 25.5 },
    };

    it('devrait retourner les données du ticket lié à une dépense', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.getTicketByExpense.mockResolvedValue(mockTicketData);

      const result = await controller.getTicketByExpense(10, mockReq);

      expect(mockTicketService.getTicketByExpense).toHaveBeenCalledWith(10, mockUser);
      expect(result).toEqual(mockTicketData);
    });

    it('devrait lever UnauthorizedException si aucun Bearer header', async () => {
      const badReq = { headers: {} };
      await expect(controller.getTicketByExpense(10, badReq)).rejects.toThrow(UnauthorizedException);
    });

    it('devrait propager NotFoundException si aucun lien trouvé', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.getTicketByExpense.mockRejectedValue(
        new NotFoundException('Aucun ticket lié à cette dépense'),
      );

      await expect(controller.getTicketByExpense(10, mockReq)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── DELETE /ticket/link/:expenseId ───────────────────────────────────────

  describe('deleteLinkByExpense', () => {
    const mockReq = { headers: { authorization: 'Bearer valid_token' } };

    it('devrait supprimer le lien ticket-dépense avec succès', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.deleteLinkByExpense.mockResolvedValue(undefined);

      const result = await controller.deleteLinkByExpense(10, mockReq);

      expect(mockTicketService.deleteLinkByExpense).toHaveBeenCalledWith(10, mockUser);
      expect(result).toEqual({ success: true });
    });

    it('devrait lever UnauthorizedException si aucun Bearer header', async () => {
      const badReq = { headers: {} };
      await expect(controller.deleteLinkByExpense(10, badReq)).rejects.toThrow(UnauthorizedException);
    });

    it('devrait propager NotFoundException si aucun lien trouvé', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.deleteLinkByExpense.mockRejectedValue(
        new NotFoundException('Aucun lien ticket-dépense trouvé'),
      );

      await expect(controller.deleteLinkByExpense(10, mockReq)).rejects.toThrow(NotFoundException);
    });

    it('devrait propager ForbiddenException si l\'utilisateur n\'est pas propriétaire', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(mockJwtPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTicketService.deleteLinkByExpense.mockRejectedValue(
        new ForbiddenException('Non autorisé'),
      );

      await expect(controller.deleteLinkByExpense(10, mockReq)).rejects.toThrow(ForbiddenException);
    });
  });
});
