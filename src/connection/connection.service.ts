import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserDTO } from '../dto/UserDTO';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import { compare, hash } from 'bcrypt';
import { LoginDTO } from '../dto/LoginDTO';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import { randomBytes } from 'crypto';  // Ajoute en haut avec tes imports
dotenv.config();
@Injectable()
export class ConnectionService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async signup(user: UserDTO): Promise<{ jwt: string; user: User }> { // Modified signature
    const hashedPassword = await hash(user.password, 10);

    const emailVerificationToken = uuidv4();

    const newUser = this.userRepository.create({
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      password: hashedPassword,
      emailVerificationToken,
      isEmailVerified: false,
    });

    const savedUser = await this.userRepository.save(newUser); // Save first to get an ID for JWT

    const jwt = await this.jwtService.signAsync(
      { id: savedUser.id }, // Use savedUser.id
      { secret: process.env.secret },
    );

    await this.sendVerificationEmail(user.email, emailVerificationToken);
    
    return { jwt, user: savedUser }; // Return jwt and user
  }

  async login(
    user: LoginDTO,
    res,
  ): Promise<any> {
    try {
      const { password, email } = user;

      // Vérifier si l'email existe
      const userFind = await this.userRepository.findOneBy({ email: email });
      if (!userFind) {
        return {
          status: 404,
          success: false,
          message: 'Utilisateur non trouvé. Vérifiez votre email.'
        };
      }

      // Vérifier si l'email est vérifié
      if (!userFind.isEmailVerified) {
        return {
          status: 401,
          success: false,
          message: 'Veuillez vérifier votre email avant de vous connecter.'
        };
      }

      // Vérifier le mot de passe
      const passwordValid = await compare(user.password, userFind.password);
      if (!passwordValid) {
        return {
          status: 401,
          success: false,
          message: 'Mot de passe incorrect.'
        };
      }

      // Générer le JWT
      try {
        const jwt = await this.jwtService.signAsync(
          { id: userFind.id },
          { secret: process.env.secret },
        );

        if (!jwt) {
          return {
            status: 500,
            success: false,
            message: 'Erreur lors de la génération du token JWT.'
          };
        }

        // Créer le cookie et retourner la réponse
        res.cookie('jwt', jwt, { httpOnly: true });
        return {
          status: 200,
          success: true,
          id: userFind.id,
          email: userFind.email,
          nom: userFind.nom,
          prenom: userFind.prenom,
          jwt: jwt,
        };
      } catch (jwtError) {
        console.error('Erreur JWT:', jwtError);
        return {
          status: 500,
          success: false,
          message: 'Erreur de connexion: impossible de générer le token d\'authentification.'
        };
      }
    } catch (error) {
      // Renvoyer une réponse d'erreur générique en cas d'exception non gérée
      return {
        status: 500,
        success: false,
        message: 'Une erreur s\'est produite lors de la connexion.'
      };
    }
  }

  async update(id: number, userDTO: UserDTO) {
    await this.userRepository.update(id, {
      nom: userDTO.nom,
      prenom: userDTO.prenom,
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = token; // Supprimer le token après la vérification

    await this.userRepository.save(user);
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false, // Ignore les erreurs de certificat
      },
    });

    const verificationUrl = `${process.env.VERIFICATION_URL}?token=${token}`;

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: 'Email Verification',
      text: `Please verify your email by clicking on the following link: ${verificationUrl}`,
    };

    await transporter.sendMail(mailOptions);
  }

  // Dans ConnectionService
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('Aucun utilisateur trouvé avec cet email');
    }
    console.log(user)
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpire = new Date();
    resetTokenExpire.setHours(resetTokenExpire.getHours() + 1); // 1 heure de validité

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = resetTokenExpire;

    await this.userRepository.save(user);

    await this.sendResetPasswordEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpire: MoreThan(new Date())
      }
    });
    console.log(user)
    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    user.password = await hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;

    await this.userRepository.save(user);
  }

  async sendResetPasswordEmail(email: string, token: string): Promise<{ success: boolean; message: string }> {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const resetUrl = `${process.env.RESET_PASSWORD_URL}?token=${token}`;

    const mailOptions = {
      from: process.env.MAIL_USER,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Pour réinitialiser votre mot de passe, cliquez sur le lien suivant : ${resetUrl}\nCe lien est valable 1 heure.`,
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Mot de passe réinitialisé avec succès.' };
  }

}
