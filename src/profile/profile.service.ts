import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import * as fs from 'fs';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserProfile(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'nom',
        'prenom',
        'profilePicture',
        'phoneNumber',
        'dateOfBirth',
        'address',
        'isEmailVerified',
      ],
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  async updateProfile(
    userId: number,
    updateData: {
      nom?: string;
      prenom?: string;
      phoneNumber?: string;
      dateOfBirth?: Date;
      address?: string;
    },
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Mettre à jour les champs fournis
    if (updateData.nom !== undefined) user.nom = updateData.nom;
    if (updateData.prenom !== undefined) user.prenom = updateData.prenom;
    if (updateData.phoneNumber !== undefined)
      user.phoneNumber = updateData.phoneNumber;
    if (updateData.dateOfBirth !== undefined)
      user.dateOfBirth = updateData.dateOfBirth;
    if (updateData.address !== undefined) user.address = updateData.address;

    await this.userRepository.save(user);

    this.logger.log(`Profil mis à jour pour l'utilisateur ${userId}`);

    return this.getUserProfile(userId);
  }

  async updateProfilePicture(
    userId: number,
    imagePath: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Supprimer l'ancienne photo si elle existe
    if (user.profilePicture && fs.existsSync(user.profilePicture)) {
      try {
        fs.unlinkSync(user.profilePicture);
        this.logger.log(`Ancienne photo de profil supprimée: ${user.profilePicture}`);
      } catch (error) {
        this.logger.warn(
          `Impossible de supprimer l'ancienne photo: ${error.message}`,
        );
      }
    }

    user.profilePicture = imagePath;
    await this.userRepository.save(user);

    this.logger.log(`Photo de profil mise à jour pour l'utilisateur ${userId}`);

    return this.getUserProfile(userId);
  }

  async deleteProfilePicture(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.profilePicture && fs.existsSync(user.profilePicture)) {
      try {
        fs.unlinkSync(user.profilePicture);
        this.logger.log(`Photo de profil supprimée: ${user.profilePicture}`);
      } catch (error) {
        this.logger.warn(
          `Impossible de supprimer la photo: ${error.message}`,
        );
      }
    }

    user.profilePicture = null;
    await this.userRepository.save(user);

    return this.getUserProfile(userId);
  }
}
