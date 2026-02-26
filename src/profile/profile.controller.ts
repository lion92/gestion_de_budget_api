import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Res,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { ProfileService } from './profile.service';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

const profilePicturesPath = join(__dirname, '..', '..', 'uploads', 'profiles');
if (!fs.existsSync(profilePicturesPath)) {
  fs.mkdirSync(profilePicturesPath, { recursive: true });
}

@Controller('profile')
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(
    private readonly profileService: ProfileService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  @Post('me')
  async getProfile(@Body() body: { jwt: string }) {
    try {
      if (!body.jwt) {
        throw new BadRequestException('Token JWT requis');
      }

      const data = await this.jwtService.verifyAsync(body.jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      const profile = await this.profileService.getUserProfile(data.id);

      return {
        success: true,
        profile,
      };
    } catch (error) {
      this.logger.error('Erreur récupération profil:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la récupération du profil',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Mettre à jour le profil de l'utilisateur
   */
  @Put('update')
  async updateProfile(
    @Body()
    body: {
      jwt: string;
      nom?: string;
      prenom?: string;
      phoneNumber?: string;
      dateOfBirth?: string;
      address?: string;
    },
  ) {
    try {
      if (!body.jwt) {
        throw new BadRequestException('Token JWT requis');
      }

      const data = await this.jwtService.verifyAsync(body.jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      const updateData: any = {};
      if (body.nom !== undefined) updateData.nom = body.nom;
      if (body.prenom !== undefined) updateData.prenom = body.prenom;
      if (body.phoneNumber !== undefined)
        updateData.phoneNumber = body.phoneNumber;
      if (body.dateOfBirth !== undefined)
        updateData.dateOfBirth = new Date(body.dateOfBirth);
      if (body.address !== undefined) updateData.address = body.address;

      const profile = await this.profileService.updateProfile(
        data.id,
        updateData,
      );

      return {
        success: true,
        message: 'Profil mis à jour avec succès',
        profile,
      };
    } catch (error) {
      this.logger.error('Erreur mise à jour profil:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la mise à jour du profil',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload d'une photo de profil
   */
  @Post('upload-picture')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: profilePicturesPath,
        filename: (req, file, cb) => {
          const uniqueName = `profile-${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png'];
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

        const ext = extname(file.originalname).toLowerCase();
        const mimeType = file.mimetype;

        if (
          !allowedExtensions.includes(ext) ||
          !allowedMimeTypes.includes(mimeType)
        ) {
          return cb(
            new BadRequestException(
              'Format de fichier non supporté. Utilisez: JPG, JPEG ou PNG',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5 Mo
        files: 1,
      },
    }),
  )
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { jwt: string },
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Aucun fichier fourni');
      }

      if (!body.jwt) {
        throw new BadRequestException('Token JWT requis');
      }

      const data = await this.jwtService.verifyAsync(body.jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      // Validation supplémentaire de la taille
      if (file.size > 5 * 1024 * 1024) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        throw new BadRequestException('Fichier trop volumineux (max 5MB)');
      }

      const profile = await this.profileService.updateProfilePicture(
        data.id,
        file.path,
      );

      return {
        success: true,
        message: 'Photo de profil uploadée avec succès',
        profile,
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
        },
      };
    } catch (error) {
      // Nettoyer le fichier en cas d'erreur
      if (file?.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          this.logger.warn(
            `Impossible de supprimer le fichier: ${cleanupError.message}`,
          );
        }
      }

      this.logger.error('Erreur upload photo de profil:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Erreur lors de l'upload: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Supprimer la photo de profil
   */
  @Delete('delete-picture')
  async deleteProfilePicture(@Body() body: { jwt: string }) {
    try {
      if (!body.jwt) {
        throw new BadRequestException('Token JWT requis');
      }

      const data = await this.jwtService.verifyAsync(body.jwt, {
        secret: process.env.JWT_SECRET || process.env.secret,
      });

      if (!data?.id) {
        throw new UnauthorizedException('Token JWT invalide');
      }

      const profile = await this.profileService.deleteProfilePicture(data.id);

      return {
        success: true,
        message: 'Photo de profil supprimée avec succès',
        profile,
      };
    } catch (error) {
      this.logger.error('Erreur suppression photo de profil:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la suppression de la photo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Servir la photo de profil d'un utilisateur
   */
  @Get('picture/:userId')
  async getProfilePicture(@Param('userId') userId: number, @Res() res) {
    try {
      const profile = await this.profileService.getUserProfile(userId);

      if (!profile.profilePicture || !fs.existsSync(profile.profilePicture)) {
        throw new HttpException(
          'Photo de profil non trouvée',
          HttpStatus.NOT_FOUND,
        );
      }

      res.sendFile(profile.profilePicture);
    } catch (error) {
      this.logger.error(
        `Erreur récupération photo de profil ${userId}:`,
        error,
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erreur lors de la récupération de la photo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
