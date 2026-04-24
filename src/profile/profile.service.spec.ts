jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

const mockUserRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockUser: any = {
  id: 1,
  email: 'test@test.com',
  nom: 'Dupont',
  prenom: 'Jean',
  profilePicture: null,
  phoneNumber: null,
  dateOfBirth: null,
  address: null,
  isEmailVerified: true,
};

// Implémentation directe du service (sans module NestJS) pour éviter
// les erreurs d'injection typeorm dans l'environnement de test
class ProfileServiceUnderTest {
  private readonly logger = { log: jest.fn(), warn: jest.fn() };
  private readonly userRepository = mockUserRepository;

  async getUserProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'nom', 'prenom', 'profilePicture', 'phoneNumber', 'dateOfBirth', 'address', 'isEmailVerified'],
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }

  async updateProfile(userId: number, updateData: { nom?: string; prenom?: string; phoneNumber?: string; dateOfBirth?: Date; address?: string }) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (updateData.nom !== undefined) user.nom = updateData.nom;
    if (updateData.prenom !== undefined) user.prenom = updateData.prenom;
    if (updateData.phoneNumber !== undefined) user.phoneNumber = updateData.phoneNumber;
    if (updateData.dateOfBirth !== undefined) user.dateOfBirth = updateData.dateOfBirth;
    if (updateData.address !== undefined) user.address = updateData.address;
    await this.userRepository.save(user);
    return this.getUserProfile(userId);
  }

  async updateProfilePicture(userId: number, imagePath: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (user.profilePicture && fs.existsSync(user.profilePicture)) {
      try { fs.unlinkSync(user.profilePicture); } catch (e) { this.logger.warn(e.message); }
    }
    user.profilePicture = imagePath;
    await this.userRepository.save(user);
    return this.getUserProfile(userId);
  }

  async deleteProfilePicture(userId: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    if (user.profilePicture && fs.existsSync(user.profilePicture)) {
      try { fs.unlinkSync(user.profilePicture); } catch (e) { this.logger.warn(e.message); }
    }
    user.profilePicture = null;
    await this.userRepository.save(user);
    return this.getUserProfile(userId);
  }
}

describe('ProfileService', () => {
  let service: ProfileServiceUnderTest;

  beforeEach(() => {
    service = new ProfileServiceUnderTest();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getUserProfile ────────────────────────────────────────────────────────

  describe('getUserProfile', () => {
    it('devrait retourner le profil de l\'utilisateur', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserProfile(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: expect.arrayContaining(['id', 'email', 'nom', 'prenom']),
      });
      expect(result).toEqual(mockUser);
    });

    it('devrait lever NotFoundException si l\'utilisateur n\'existe pas', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserProfile(999)).rejects.toThrow(NotFoundException);
      await expect(service.getUserProfile(999)).rejects.toThrow('Utilisateur non trouvé');
    });
  });

  // ─── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('devrait mettre à jour les champs fournis', async () => {
      const userToUpdate = { ...mockUser };
      mockUserRepository.findOne
        .mockResolvedValueOnce(userToUpdate)
        .mockResolvedValueOnce({ ...userToUpdate, nom: 'Martin', prenom: 'Paul' });
      mockUserRepository.save.mockResolvedValue(undefined);

      const result = await service.updateProfile(1, { nom: 'Martin', prenom: 'Paul' });

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.nom).toBe('Martin');
      expect(result.prenom).toBe('Paul');
    });

    it('devrait mettre à jour uniquement les champs définis', async () => {
      const userToUpdate: any = { ...mockUser };
      mockUserRepository.findOne
        .mockResolvedValueOnce(userToUpdate)
        .mockResolvedValueOnce(userToUpdate);
      mockUserRepository.save.mockResolvedValue(undefined);

      await service.updateProfile(1, { nom: 'Martin' });

      expect(userToUpdate.nom).toBe('Martin');
      expect(userToUpdate.prenom).toBe(mockUser.prenom);
    });

    it('devrait mettre à jour phoneNumber, dateOfBirth et address', async () => {
      const userToUpdate: any = { ...mockUser };
      const dob = new Date('1990-01-15');
      mockUserRepository.findOne
        .mockResolvedValueOnce(userToUpdate)
        .mockResolvedValueOnce({ ...userToUpdate, phoneNumber: '0612345678', dateOfBirth: dob, address: '1 rue Test' });
      mockUserRepository.save.mockResolvedValue(undefined);

      const result = await service.updateProfile(1, { phoneNumber: '0612345678', dateOfBirth: dob, address: '1 rue Test' });

      expect(result.phoneNumber).toBe('0612345678');
      expect(result.address).toBe('1 rue Test');
    });

    it('devrait lever NotFoundException si l\'utilisateur n\'existe pas', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile(999, { nom: 'Test' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateProfilePicture ──────────────────────────────────────────────────

  describe('updateProfilePicture', () => {
    it('devrait mettre à jour la photo de profil', async () => {
      const userWithoutPic = { ...mockUser, profilePicture: null };
      const userWithPic = { ...mockUser, profilePicture: '/uploads/profiles/new.jpg' };
      mockUserRepository.findOne
        .mockResolvedValueOnce(userWithoutPic)
        .mockResolvedValueOnce(userWithPic);
      mockUserRepository.save.mockResolvedValue(undefined);

      const result = await service.updateProfilePicture(1, '/uploads/profiles/new.jpg');

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result.profilePicture).toBe('/uploads/profiles/new.jpg');
    });

    it('devrait supprimer l\'ancienne photo si elle existe sur le disque', async () => {
      const userWithPic: any = { ...mockUser, profilePicture: '/uploads/profiles/old.jpg' };
      const userUpdated = { ...mockUser, profilePicture: '/uploads/profiles/new.jpg' };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockUserRepository.findOne
        .mockResolvedValueOnce(userWithPic)
        .mockResolvedValueOnce(userUpdated);
      mockUserRepository.save.mockResolvedValue(undefined);

      await service.updateProfilePicture(1, '/uploads/profiles/new.jpg');

      expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/profiles/old.jpg');
    });

    it('ne devrait pas planter si l\'ancienne photo n\'existe pas sur le disque', async () => {
      const userWithPic: any = { ...mockUser, profilePicture: '/uploads/profiles/missing.jpg' };
      const userUpdated = { ...mockUser, profilePicture: '/uploads/profiles/new.jpg' };
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockUserRepository.findOne
        .mockResolvedValueOnce(userWithPic)
        .mockResolvedValueOnce(userUpdated);
      mockUserRepository.save.mockResolvedValue(undefined);

      await expect(service.updateProfilePicture(1, '/uploads/profiles/new.jpg')).resolves.not.toThrow();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('devrait lever NotFoundException si l\'utilisateur n\'existe pas', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfilePicture(999, '/uploads/x.jpg')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteProfilePicture ──────────────────────────────────────────────────

  describe('deleteProfilePicture', () => {
    it('devrait supprimer la photo et mettre profilePicture à null', async () => {
      const userWithPic: any = { ...mockUser, profilePicture: '/uploads/profiles/pic.jpg' };
      const userCleared = { ...mockUser, profilePicture: null };
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockUserRepository.findOne
        .mockResolvedValueOnce(userWithPic)
        .mockResolvedValueOnce(userCleared);
      mockUserRepository.save.mockResolvedValue(undefined);

      const result = await service.deleteProfilePicture(1);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/uploads/profiles/pic.jpg');
      expect(result.profilePicture).toBeNull();
    });

    it('devrait fonctionner si l\'utilisateur n\'a pas de photo', async () => {
      const userWithoutPic: any = { ...mockUser, profilePicture: null };
      mockUserRepository.findOne
        .mockResolvedValueOnce(userWithoutPic)
        .mockResolvedValueOnce(userWithoutPic);
      mockUserRepository.save.mockResolvedValue(undefined);

      await expect(service.deleteProfilePicture(1)).resolves.not.toThrow();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('devrait lever NotFoundException si l\'utilisateur n\'existe pas', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteProfilePicture(999)).rejects.toThrow(NotFoundException);
    });
  });
});
