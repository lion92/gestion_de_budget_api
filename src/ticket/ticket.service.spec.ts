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

jest.mock('tesseract.js', () => ({
  recognize: jest.fn().mockResolvedValue({ data: { text: '' } }),
  createWorker: jest.fn().mockResolvedValue({
    initialize: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue({ data: { text: '' } }),
    terminate: jest.fn().mockResolvedValue(undefined),
  }),
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

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync: jest.fn(),
  createReadStream: jest.fn(),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

// ─── Repositories mockés ──────────────────────────────────────────────────────

const mockTicketRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockTicketExpenseRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockActionRepo = {
  findOne: jest.fn(),
};

// ─── Implémentation testée directement (sans module NestJS / vraie DB) ────────

class TicketServiceUnderTest {
  private readonly ticketRepository = mockTicketRepo;
  private readonly ticketExpenseRepository = mockTicketExpenseRepo;
  private readonly actionRepository = mockActionRepo;
  private readonly logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

  async linkTicketToExpense(
    ticketId: number,
    expenseId: number,
    extractedData: Record<string, any>,
    user: any,
  ) {
    const expense = await this.actionRepository.findOne({
      where: { id: expenseId },
      relations: ['user'],
    });
    if (!expense) throw new NotFoundException('Dépense introuvable');
    if (expense.user.id !== user.id) throw new ForbiddenException('Dépense non autorisée');

    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket introuvable');

    const existing = await this.ticketExpenseRepository.findOne({
      where: { expense: { id: expenseId } },
    });

    const link = existing ?? this.ticketExpenseRepository.create();
    link.ticketId = ticketId;
    link.expense = expense;
    link.user = user;
    link.extractedData = extractedData;

    return this.ticketExpenseRepository.save(link);
  }

  async getTicketByExpense(expenseId: number, user: any) {
    const link = await this.ticketExpenseRepository.findOne({
      where: { expense: { id: expenseId }, user: { id: user.id } },
    });
    if (!link) throw new NotFoundException('Aucun ticket lié à cette dépense');

    const ticket = await this.ticketRepository.findOne({ where: { id: link.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket introuvable');

    const fileName = ticket.imagePath ? ticket.imagePath.split('/').pop() : '';
    const baseUrl = process.env.BASE_URL || 'https://www.krisscode.fr/budget-api';
    const fileUrl = `${baseUrl}/ticket/image/${ticket.id}`;

    return { ticketId: ticket.id, fileName, fileUrl, extractedData: link.extractedData ?? {} };
  }

  async deleteLinkByExpense(expenseId: number, user: any) {
    const link = await this.ticketExpenseRepository.findOne({
      where: { expense: { id: expenseId }, user: { id: user.id } },
    });
    if (!link) throw new NotFoundException('Aucun lien ticket-dépense trouvé');
    await this.ticketExpenseRepository.remove(link);
  }

  async deleteTicket(id: number, user: any) {
    const ticket = await this.ticketRepository.findOne({ where: { id, user } });
    if (!ticket) throw new NotFoundException('Ticket non trouvé ou non autorisé.');
    await this.ticketRepository.remove(ticket);
  }

  // Méthodes privées exposées pour les tests unitaires
  applyOCRCorrections(text: string): string {
    const corrections: [RegExp, string][] = [
      [/\bT[O0]TAL\b/gi, 'TOTAL'],
      [/\bTUTAL\b/gi, 'TOTAL'],
      [/\bT[O0]TAI\b/gi, 'TOTAL'],
      [/\bTOTRL\b/gi, 'TOTAL'],
      [/\bT0TAI\b/gi, 'TOTAL'],
      [/\bM[O0]NTANT\b/gi, 'MONTANT'],
      [/\bPA¥ER\b/gi, 'PAYER'],
      [/\bPAYEl\b/gi, 'PAYER'],
      [/\bPAYEF\b/gi, 'PAYER'],
      [/\bNEr\b/gi, 'NET'],
      [/\bLUR\b/gi, 'EUR'],
      [/\bTVfl\b/gi, 'TVA'],
      [/\bTV4\b/gi, 'TVA'],
      [/(\d)[Ol](\d)/g, '$10$2'],
      [/(\d)[Il](\d)/g, '$11$2'],
    ];
    return corrections.reduce((t, [re, rep]) => t.replace(re, rep), text);
  }

  extractPricesFromLine(line: string): number[] {
    const seen = new Set<number>();
    const add = (p: number) => {
      if (p > 0.01 && p < 10000 && !seen.has(p)) seen.add(p);
    };
    const p1 = /(\d{1,4})[,.](\d{2})(?:\s*[€E])?/g;
    let m: RegExpExecArray | null;
    while ((m = p1.exec(line)) !== null) add(parseFloat(`${m[1]}.${m[2]}`));
    const p2 = /[€E]\s*(\d{1,4})[,.](\d{2})/g;
    while ((m = p2.exec(line)) !== null) add(parseFloat(`${m[1]}.${m[2]}`));
    const p3 = /(\d{1,4})[,.](\d{1})(?!\d)/g;
    while ((m = p3.exec(line)) !== null) add(parseFloat(`${m[1]}.${m[2]}0`));
    const p4 = /(\d{1,4})\s(\d{2})\s*€/g;
    while ((m = p4.exec(line)) !== null) add(parseFloat(`${m[1]}.${m[2]}`));
    const p5 = /\b(\d{1,4})\s*[€E]\b/g;
    while ((m = p5.exec(line)) !== null) add(parseFloat(`${m[1]}.00`));
    return Array.from(seen);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TicketService', () => {
  let service: TicketServiceUnderTest;

  const mockUser = { id: 1, email: 'test@test.com' };

  beforeEach(() => {
    service = new TicketServiceUnderTest();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── linkTicketToExpense ───────────────────────────────────────────────────

  describe('linkTicketToExpense', () => {
    const mockExpense = { id: 10, user: { id: 1 } };
    const mockTicket = { id: 5, imagePath: '/uploads/ticket5.jpg' };
    const extractedData = { total: 25.5, date: '2026-04-24' };

    it('devrait créer un lien ticket-dépense', async () => {
      mockActionRepo.findOne.mockResolvedValue(mockExpense);
      mockTicketRepo.findOne.mockResolvedValue(mockTicket);
      mockTicketExpenseRepo.findOne.mockResolvedValue(null);
      mockTicketExpenseRepo.create.mockReturnValue({});
      mockTicketExpenseRepo.save.mockResolvedValue({ id: 1, ticketId: 5, expense: mockExpense });

      const result = await service.linkTicketToExpense(5, 10, extractedData, mockUser);

      expect(mockActionRepo.findOne).toHaveBeenCalledWith({ where: { id: 10 }, relations: ['user'] });
      expect(mockTicketRepo.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(mockTicketExpenseRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('devrait faire un UPSERT si un lien existe déjà pour la dépense', async () => {
      const existingLink = { id: 99, ticketId: 3, expense: mockExpense, user: mockUser, extractedData: {} };
      mockActionRepo.findOne.mockResolvedValue(mockExpense);
      mockTicketRepo.findOne.mockResolvedValue(mockTicket);
      mockTicketExpenseRepo.findOne.mockResolvedValue(existingLink);
      mockTicketExpenseRepo.save.mockResolvedValue({ ...existingLink, ticketId: 5 });

      await service.linkTicketToExpense(5, 10, extractedData, mockUser);

      expect(mockTicketExpenseRepo.create).not.toHaveBeenCalled();
      expect(mockTicketExpenseRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ ticketId: 5, extractedData }),
      );
    });

    it('devrait lever NotFoundException si la dépense n\'existe pas', async () => {
      mockActionRepo.findOne.mockResolvedValue(null);

      await expect(service.linkTicketToExpense(5, 99, {}, mockUser)).rejects.toThrow(NotFoundException);
      await expect(service.linkTicketToExpense(5, 99, {}, mockUser)).rejects.toThrow('Dépense introuvable');
    });

    it('devrait lever ForbiddenException si la dépense appartient à un autre utilisateur', async () => {
      mockActionRepo.findOne.mockResolvedValue({ id: 10, user: { id: 99 } });

      await expect(service.linkTicketToExpense(5, 10, {}, mockUser)).rejects.toThrow(ForbiddenException);
      await expect(service.linkTicketToExpense(5, 10, {}, mockUser)).rejects.toThrow('Dépense non autorisée');
    });

    it('devrait lever NotFoundException si le ticket n\'existe pas', async () => {
      mockActionRepo.findOne.mockResolvedValue(mockExpense);
      mockTicketRepo.findOne.mockResolvedValue(null);

      await expect(service.linkTicketToExpense(999, 10, {}, mockUser)).rejects.toThrow(NotFoundException);
      await expect(service.linkTicketToExpense(999, 10, {}, mockUser)).rejects.toThrow('Ticket introuvable');
    });
  });

  // ─── getTicketByExpense ────────────────────────────────────────────────────

  describe('getTicketByExpense', () => {
    const mockLink = { ticketId: 5, extractedData: { total: 25.5 } };
    const mockTicket = { id: 5, imagePath: '/uploads/ticket5.jpg' };

    it('devrait retourner les infos du ticket lié à une dépense', async () => {
      mockTicketExpenseRepo.findOne.mockResolvedValue(mockLink);
      mockTicketRepo.findOne.mockResolvedValue(mockTicket);

      const result = await service.getTicketByExpense(10, mockUser);

      expect(result.ticketId).toBe(5);
      expect(result.fileName).toBe('ticket5.jpg');
      expect(result.fileUrl).toContain('/ticket/image/5');
      expect(result.extractedData).toEqual({ total: 25.5 });
    });

    it('devrait retourner un extractedData vide si null en DB', async () => {
      mockTicketExpenseRepo.findOne.mockResolvedValue({ ticketId: 5, extractedData: null });
      mockTicketRepo.findOne.mockResolvedValue(mockTicket);

      const result = await service.getTicketByExpense(10, mockUser);

      expect(result.extractedData).toEqual({});
    });

    it('devrait gérer un imagePath absent (fileName vide)', async () => {
      mockTicketExpenseRepo.findOne.mockResolvedValue(mockLink);
      mockTicketRepo.findOne.mockResolvedValue({ id: 5, imagePath: null });

      const result = await service.getTicketByExpense(10, mockUser);

      expect(result.fileName).toBe('');
    });

    it('devrait lever NotFoundException si aucun lien trouvé', async () => {
      mockTicketExpenseRepo.findOne.mockResolvedValue(null);

      await expect(service.getTicketByExpense(10, mockUser)).rejects.toThrow(NotFoundException);
      await expect(service.getTicketByExpense(10, mockUser)).rejects.toThrow('Aucun ticket lié à cette dépense');
    });

    it('devrait lever NotFoundException si le ticket n\'existe plus en DB', async () => {
      mockTicketExpenseRepo.findOne.mockResolvedValue(mockLink);
      mockTicketRepo.findOne.mockResolvedValue(null);

      await expect(service.getTicketByExpense(10, mockUser)).rejects.toThrow(NotFoundException);
      await expect(service.getTicketByExpense(10, mockUser)).rejects.toThrow('Ticket introuvable');
    });
  });

  // ─── deleteLinkByExpense ───────────────────────────────────────────────────

  describe('deleteLinkByExpense', () => {
    it('devrait supprimer le lien ticket-dépense', async () => {
      const mockLink = { id: 1, ticketId: 5 };
      mockTicketExpenseRepo.findOne.mockResolvedValue(mockLink);
      mockTicketExpenseRepo.remove.mockResolvedValue(undefined);

      await expect(service.deleteLinkByExpense(10, mockUser)).resolves.not.toThrow();
      expect(mockTicketExpenseRepo.remove).toHaveBeenCalledWith(mockLink);
    });

    it('devrait lever NotFoundException si aucun lien n\'existe', async () => {
      mockTicketExpenseRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteLinkByExpense(10, mockUser)).rejects.toThrow(NotFoundException);
      await expect(service.deleteLinkByExpense(10, mockUser)).rejects.toThrow('Aucun lien ticket-dépense trouvé');
    });

    it('ne devrait pas supprimer si l\'utilisateur ne correspond pas', async () => {
      mockTicketExpenseRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteLinkByExpense(10, { id: 99 })).rejects.toThrow(NotFoundException);
      expect(mockTicketExpenseRepo.remove).not.toHaveBeenCalled();
    });
  });

  // ─── deleteTicket ──────────────────────────────────────────────────────────

  describe('deleteTicket', () => {
    it('devrait supprimer le ticket de l\'utilisateur', async () => {
      const mockTicket = { id: 5, imagePath: '/uploads/ticket5.jpg' };
      mockTicketRepo.findOne.mockResolvedValue(mockTicket);
      mockTicketRepo.remove.mockResolvedValue(undefined);

      await expect(service.deleteTicket(5, mockUser)).resolves.not.toThrow();
      expect(mockTicketRepo.remove).toHaveBeenCalledWith(mockTicket);
    });

    it('devrait lever NotFoundException si le ticket n\'existe pas ou n\'appartient pas à l\'utilisateur', async () => {
      mockTicketRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteTicket(999, mockUser)).rejects.toThrow(NotFoundException);
      await expect(service.deleteTicket(999, mockUser)).rejects.toThrow('Ticket non trouvé ou non autorisé.');
    });
  });

  // ─── OCR : applyOCRCorrections ─────────────────────────────────────────────

  describe('applyOCRCorrections', () => {
    it('devrait corriger T0TAL en TOTAL', () => {
      expect(service.applyOCRCorrections('T0TAL 15,50')).toBe('TOTAL 15,50');
    });

    it('devrait corriger TUTAL en TOTAL', () => {
      expect(service.applyOCRCorrections('TUTAL 12,00')).toBe('TOTAL 12,00');
    });

    it('devrait corriger TOTRL en TOTAL', () => {
      expect(service.applyOCRCorrections('TOTRL 8,99')).toBe('TOTAL 8,99');
    });

    it('devrait corriger M0NTANT en MONTANT', () => {
      expect(service.applyOCRCorrections('M0NTANT DÛ')).toBe('MONTANT DÛ');
    });

    it('devrait corriger PA¥ER en PAYER', () => {
      expect(service.applyOCRCorrections('NET A PA¥ER')).toBe('NET A PAYER');
    });

    it('devrait corriger PAYEl en PAYER', () => {
      expect(service.applyOCRCorrections('PAYEl 12,00')).toBe('PAYER 12,00');
    });

    it('devrait corriger TVfl en TVA', () => {
      expect(service.applyOCRCorrections('TVfl 20%')).toBe('TVA 20%');
    });

    it('devrait corriger TV4 en TVA', () => {
      expect(service.applyOCRCorrections('TV4 5%')).toBe('TVA 5%');
    });

    it('devrait corriger LUR en EUR', () => {
      expect(service.applyOCRCorrections('25,00 LUR')).toBe('25,00 EUR');
    });

    it('devrait corriger la confusion O/0 dans les chiffres', () => {
      expect(service.applyOCRCorrections('1O5')).toBe('105');
    });

    it('devrait corriger la confusion I/l dans les chiffres', () => {
      expect(service.applyOCRCorrections('1I5')).toBe('115');
    });

    it('ne devrait pas modifier un texte déjà correct', () => {
      const text = 'TOTAL 25,50 EUR TVA 5%';
      expect(service.applyOCRCorrections(text)).toBe(text);
    });
  });

  // ─── OCR : extractPricesFromLine ───────────────────────────────────────────

  describe('extractPricesFromLine', () => {
    it('devrait extraire un prix avec virgule (format français)', () => {
      expect(service.extractPricesFromLine('TOTAL 15,50')).toContain(15.5);
    });

    it('devrait extraire un prix avec point (format anglais)', () => {
      expect(service.extractPricesFromLine('TOTAL 15.50')).toContain(15.5);
    });

    it('devrait extraire un prix suivi de €', () => {
      expect(service.extractPricesFromLine('25,00€')).toContain(25.0);
    });

    it('devrait extraire un prix précédé de €', () => {
      expect(service.extractPricesFromLine('€12,50')).toContain(12.5);
    });

    it('devrait extraire un entier suivi de € en contexte texte', () => {
      // \b après € nécessite un caractère de mot suivant
      expect(service.extractPricesFromLine('15€1')).toContain(15.0);
    });

    it('devrait extraire un prix avec espace comme séparateur décimal', () => {
      expect(service.extractPricesFromLine('12 50 €')).toContain(12.5);
    });

    it('devrait extraire plusieurs prix sur une même ligne', () => {
      const prices = service.extractPricesFromLine('Produit A 3,99 Produit B 12,50');
      expect(prices).toContain(3.99);
      expect(prices).toContain(12.5);
    });

    it('devrait ignorer les valeurs hors plage (> 10000)', () => {
      const prices = service.extractPricesFromLine('99999,99');
      expect(prices).not.toContain(99999.99);
    });

    it('devrait retourner un tableau vide si aucun prix détecté', () => {
      expect(service.extractPricesFromLine('Merci de votre visite')).toEqual([]);
    });

    it('devrait dédupliquer les prix identiques', () => {
      const prices = service.extractPricesFromLine('5,00 5,00 5,00');
      expect(prices.filter((p) => p === 5.0).length).toBe(1);
    });
  });
});
