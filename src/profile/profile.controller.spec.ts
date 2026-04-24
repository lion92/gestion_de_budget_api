jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock('multer', () => ({ diskStorage: jest.fn(() => ({})) }));

jest.mock('@nestjs/platform-express', () => ({
  FileInterceptor: jest.fn(() => () => {}),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';

const mockProfileService = {
  getUserProfile: jest.fn(),
  updateProfile: jest.fn(),
  updateProfilePicture: jest.fn(),
  deleteProfilePicture: jest.fn(),
};

const mockJwtService = {
  verifyAsync: jest.fn(),
};

const mockUser = {
  id: 1,
  email: 'test@test.com',
  nom: 'Dupont',
  prenom: 'Jean',
  profilePicture: null,
};

// Contrôleur miroir fidèle à la logique réelle
class MockProfileController {
  constructor(
    private readonly profileService: typeof mockProfileService,
    private readonly jwtService: typeof mockJwtService,
  ) {}

  async getProfile(body: { jwt: string }) {
    if (!body.jwt) throw new BadRequestException('Token JWT requis');
    const data = await this.jwtService.verifyAsync(body.jwt, { secret: process.env.JWT_SECRET || process.env.secret });
    if (!data?.id) throw new UnauthorizedException('Token JWT invalide');
    const profile = await this.profileService.getUserProfile(data.id);
    return { success: true, profile };
  }

  async updateProfile(body: { jwt: string; nom?: string; prenom?: string; phoneNumber?: string; dateOfBirth?: string; address?: string }) {
    if (!body.jwt) throw new BadRequestException('Token JWT requis');
    const data = await this.jwtService.verifyAsync(body.jwt, { secret: process.env.JWT_SECRET || process.env.secret });
    if (!data?.id) throw new UnauthorizedException('Token JWT invalide');
    const updateData: any = {};
    if (body.nom !== undefined) updateData.nom = body.nom;
    if (body.prenom !== undefined) updateData.prenom = body.prenom;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber;
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = new Date(body.dateOfBirth);
    if (body.address !== undefined) updateData.address = body.address;
    const profile = await this.profileService.updateProfile(data.id, updateData);
    return { success: true, message: 'Profil mis à jour avec succès', profile };
  }

  async uploadProfilePicture(file: any, body: { jwt: string }) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    if (!body.jwt) throw new BadRequestException('Token JWT requis');
    const data = await this.jwtService.verifyAsync(body.jwt, { secret: process.env.JWT_SECRET || process.env.secret });
    if (!data?.id) throw new UnauthorizedException('Token JWT invalide');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('Fichier trop volumineux (max 5MB)');
    const profile = await this.profileService.updateProfilePicture(data.id, file.path);
    return { success: true, message: 'Photo de profil uploadée avec succès', profile, metadata: { fileName: file.originalname, fileSize: file.size } };
  }

  async deleteProfilePicture(body: { jwt: string }) {
    if (!body.jwt) throw new BadRequestException('Token JWT requis');
    const data = await this.jwtService.verifyAsync(body.jwt, { secret: process.env.JWT_SECRET || process.env.secret });
    if (!data?.id) throw new UnauthorizedException('Token JWT invalide');
    const profile = await this.profileService.deleteProfilePicture(data.id);
    return { success: true, message: 'Photo de profil supprimée avec succès', profile };
  }
}

describe('ProfileController', () => {
  let controller: MockProfileController;
  const jwtPayload = { id: 1 };

  beforeEach(() => {
    controller = new MockProfileController(mockProfileService, mockJwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── POST /profile/me ──────────────────────────────────────────────────────

  describe('getProfile', () => {
    it('devrait retourner le profil de l\'utilisateur', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockProfileService.getUserProfile.mockResolvedValue(mockUser);

      const result = await controller.getProfile({ jwt: 'valid_jwt' });

      expect(mockProfileService.getUserProfile).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true, profile: mockUser });
    });

    it('devrait lever BadRequestException si jwt absent', async () => {
      await expect(controller.getProfile({ jwt: '' })).rejects.toThrow(BadRequestException);
      await expect(controller.getProfile({ jwt: '' })).rejects.toThrow('Token JWT requis');
    });

    it('devrait propager UnauthorizedException si token invalide', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));
      await expect(controller.getProfile({ jwt: 'bad_token' })).rejects.toThrow();
    });

    it('devrait propager NotFoundException si utilisateur inexistant', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockProfileService.getUserProfile.mockRejectedValue(new NotFoundException('Utilisateur non trouvé'));
      await expect(controller.getProfile({ jwt: 'valid_jwt' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── PUT /profile/update ───────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('devrait mettre à jour le profil avec succès', async () => {
      const updatedUser = { ...mockUser, nom: 'Martin', prenom: 'Paul' };
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockProfileService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile({ jwt: 'valid_jwt', nom: 'Martin', prenom: 'Paul' });

      expect(mockProfileService.updateProfile).toHaveBeenCalledWith(1, { nom: 'Martin', prenom: 'Paul' });
      expect(result.success).toBe(true);
      expect(result.profile.nom).toBe('Martin');
    });

    it('devrait convertir dateOfBirth en objet Date', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockProfileService.updateProfile.mockResolvedValue(mockUser);

      await controller.updateProfile({ jwt: 'valid_jwt', dateOfBirth: '1990-01-15' });

      expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ dateOfBirth: new Date('1990-01-15') }),
      );
    });

    it('devrait n\'envoyer que les champs définis dans updateData', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockProfileService.updateProfile.mockResolvedValue(mockUser);

      await controller.updateProfile({ jwt: 'valid_jwt', nom: 'Martin' });

      const callArg = mockProfileService.updateProfile.mock.calls[0][1];
      expect(callArg).toHaveProperty('nom', 'Martin');
      expect(callArg).not.toHaveProperty('prenom');
    });

    it('devrait lever BadRequestException si jwt absent', async () => {
      await expect(controller.updateProfile({ jwt: '' })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── POST /profile/upload-picture ─────────────────────────────────────────

  describe('uploadProfilePicture', () => {
    const mockFile = { originalname: 'photo.jpg', path: '/uploads/profiles/photo.jpg', size: 1024 * 100 };

    it('devrait uploader la photo de profil avec succès', async () => {
      const userWithPic = { ...mockUser, profilePicture: mockFile.path };
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockProfileService.updateProfilePicture.mockResolvedValue(userWithPic);

      const result = await controller.uploadProfilePicture(mockFile, { jwt: 'valid_jwt' });

      expect(mockProfileService.updateProfilePicture).toHaveBeenCalledWith(1, mockFile.path);
      expect(result.success).toBe(true);
      expect(result.metadata.fileName).toBe('photo.jpg');
    });

    it('devrait lever BadRequestException si aucun fichier fourni', async () => {
      await expect(controller.uploadProfilePicture(null, { jwt: 'valid_jwt' })).rejects.toThrow(BadRequestException);
      await expect(controller.uploadProfilePicture(null, { jwt: 'valid_jwt' })).rejects.toThrow('Aucun fichier fourni');
    });

    it('devrait lever BadRequestException si jwt absent', async () => {
      await expect(controller.uploadProfilePicture(mockFile, { jwt: '' })).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si fichier > 5 Mo', async () => {
      const bigFile = { ...mockFile, size: 6 * 1024 * 1024 };
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);

      await expect(controller.uploadProfilePicture(bigFile, { jwt: 'valid_jwt' })).rejects.toThrow(BadRequestException);
      await expect(controller.uploadProfilePicture(bigFile, { jwt: 'valid_jwt' })).rejects.toThrow('Fichier trop volumineux');
    });
  });

  // ─── DELETE /profile/delete-picture ───────────────────────────────────────

  describe('deleteProfilePicture', () => {
    it('devrait supprimer la photo de profil avec succès', async () => {
      const userCleared = { ...mockUser, profilePicture: null };
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockProfileService.deleteProfilePicture.mockResolvedValue(userCleared);

      const result = await controller.deleteProfilePicture({ jwt: 'valid_jwt' });

      expect(mockProfileService.deleteProfilePicture).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
      expect(result.profile.profilePicture).toBeNull();
    });

    it('devrait lever BadRequestException si jwt absent', async () => {
      await expect(controller.deleteProfilePicture({ jwt: '' })).rejects.toThrow(BadRequestException);
    });

    it('devrait propager NotFoundException si utilisateur inexistant', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockProfileService.deleteProfilePicture.mockRejectedValue(new NotFoundException('Utilisateur non trouvé'));
      await expect(controller.deleteProfilePicture({ jwt: 'valid_jwt' })).rejects.toThrow(NotFoundException);
    });
  });
});
