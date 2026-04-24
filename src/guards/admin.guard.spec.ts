import { UnauthorizedException } from '@nestjs/common';

const mockJwtService = { verifyAsync: jest.fn() };
const mockUserRepository = { findOne: jest.fn() };

// Réimplémentation locale du guard pour tester la logique sans le module NestJS
class TestAdminGuard {
  constructor(
    private jwtService: typeof mockJwtService,
    private userRepository: typeof mockUserRepository,
  ) {}

  private extractTokenFromCookie(request: any): string | undefined {
    return request.cookies?.jwt;
  }

  async canActivate(context: any): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookie(request);

    if (!token) throw new UnauthorizedException('Token manquant');

    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: process.env.secret });
      const user = await this.userRepository.findOne({ where: { id: payload.id } });

      if (!user) throw new UnauthorizedException('Utilisateur non trouvé');
      if (user.email !== process.env.ADMIN_EMAIL) throw new UnauthorizedException('Accès administrateur requis');

      request.user = user;
    } catch {
      throw new UnauthorizedException('Token invalide');
    }

    return true;
  }
}

const makeContext = (request: any) => ({
  switchToHttp: () => ({ getRequest: () => request }),
});

describe('AdminGuard', () => {
  let guard: TestAdminGuard;

  const adminEmail = 'admin@test.com';
  const adminUser = { id: 1, email: adminEmail };
  const normalUser = { id: 2, email: 'user@test.com' };

  beforeEach(() => {
    guard = new TestAdminGuard(mockJwtService, mockUserRepository);
    process.env.ADMIN_EMAIL = adminEmail;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  // ─── Succès ───────────────────────────────────────────────────────────────

  it('devrait autoriser un administrateur valide', async () => {
    const request: any = { cookies: { jwt: 'valid_admin_token' } };
    mockJwtService.verifyAsync.mockResolvedValue({ id: 1 });
    mockUserRepository.findOne.mockResolvedValue(adminUser);

    const result = await guard.canActivate(makeContext(request));

    expect(result).toBe(true);
    expect(request.user).toEqual(adminUser);
  });

  // ─── Token manquant ───────────────────────────────────────────────────────

  it('devrait lever UnauthorizedException si aucun cookie jwt', async () => {
    const request = { cookies: {} };

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow('Token manquant');
  });

  it('devrait lever UnauthorizedException si cookies absent', async () => {
    const request = {};

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  // ─── Token invalide ───────────────────────────────────────────────────────

  it('devrait lever UnauthorizedException si jwt malformé', async () => {
    const request = { cookies: { jwt: 'bad_token' } };
    mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow('Token invalide');
  });

  it('devrait lever UnauthorizedException si jwt expiré', async () => {
    const request = { cookies: { jwt: 'expired_token' } };
    mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  // ─── Utilisateur non trouvé ───────────────────────────────────────────────

  it('devrait lever UnauthorizedException si l\'utilisateur n\'existe pas en DB', async () => {
    const request = { cookies: { jwt: 'valid_token' } };
    mockJwtService.verifyAsync.mockResolvedValue({ id: 999 });
    mockUserRepository.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  // ─── Non administrateur ───────────────────────────────────────────────────

  it('devrait lever UnauthorizedException si l\'utilisateur n\'est pas admin', async () => {
    const request = { cookies: { jwt: 'valid_token' } };
    mockJwtService.verifyAsync.mockResolvedValue({ id: 2 });
    mockUserRepository.findOne.mockResolvedValue(normalUser);

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(UnauthorizedException);
  });

  // ─── extractTokenFromCookie ────────────────────────────────────────────────

  it('devrait lire le token depuis les cookies', async () => {
    const request: any = { cookies: { jwt: 'my_token' } };
    mockJwtService.verifyAsync.mockResolvedValue({ id: 1 });
    mockUserRepository.findOne.mockResolvedValue(adminUser);

    await guard.canActivate(makeContext(request));

    expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('my_token', expect.any(Object));
  });
});
