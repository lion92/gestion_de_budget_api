import { Test, TestingModule } from '@nestjs/testing';
import { ConnectionService } from './connection.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entity/user.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 directly
import { UserDTO } from '../dto/UserDTO'; // Import UserDTO
import { LoginDTO } from '../dto/LoginDTO'; // Import LoginDTO

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-token'),
}));

describe('ConnectionService', () => {
  let service: ConnectionService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<ConnectionService>(ConnectionService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);

    // Clear all mocks before each test
    jest.clearAllMocks();
    (nodemailer.createTransport().sendMail as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    const mockUserDTO: UserDTO = { // Use UserDTO type
      id: 1, // Add id
      email: 'newuser@test.com',
      password: 'password123',
      nom: 'New',
      prenom: 'User',
      isEmailVerified: false, // Add isEmailVerified
    };
    const mockHashedPassword = 'hashedPassword123';
    const mockJwt = 'mock.jwt.token';
    const mockEmailVerificationToken = 'mock-uuid-token';
    const mockSavedUser = {
      id: 1,
      email: mockUserDTO.email,
      nom: mockUserDTO.nom,
      prenom: mockUserDTO.prenom,
      password: mockHashedPassword,
      emailVerificationToken: mockEmailVerificationToken,
      isEmailVerified: false
    };

    beforeEach(() => {
      jest.spyOn(bcrypt, 'hash').mockResolvedValue(mockHashedPassword as never);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockJwt); // Corrected spyOn
      jest.spyOn(service, 'sendVerificationEmail').mockResolvedValue(undefined);
      mockUserRepository.create.mockReturnValue({
        email: mockUserDTO.email,
        nom: mockUserDTO.nom,
        prenom: mockUserDTO.prenom,
        password: mockHashedPassword,
        emailVerificationToken: mockEmailVerificationToken,
        isEmailVerified: false
      });
      mockUserRepository.save.mockResolvedValue(mockSavedUser); // Mock the saved user
    });

    it('should hash password, generate JWT, send verification email, and save user, returning jwt and user', async () => {
      const testUserDTO = {
        id: 1,
        email: 'newuser@test.com',
        password: 'password123',
        nom: 'New',
        prenom: 'User',
        isEmailVerified: false,
      };

      const result = await service.signup(testUserDTO); // No res object passed

      expect(bcrypt.hash).toHaveBeenCalledWith(testUserDTO.password, 10);
      expect(jwtService.signAsync).toHaveBeenCalledWith({ id: mockSavedUser.id }, { secret: process.env.secret }); // Use mockSavedUser.id
      expect(service.sendVerificationEmail).toHaveBeenCalledWith(testUserDTO.email, mockEmailVerificationToken);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: testUserDTO.email,
        nom: testUserDTO.nom,
        prenom: testUserDTO.prenom,
        password: mockHashedPassword,
        emailVerificationToken: mockEmailVerificationToken,
        isEmailVerified: false,
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ jwt: mockJwt, user: mockSavedUser }); // Assert the returned object
    });
  });

  describe('login', () => {
    const mockResponse = {
      cookie: jest.fn(),
    };

    it('should return 404 when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      const loginDTO: LoginDTO = { email: 'test@test.com', password: 'password', isEmailVerified: false }; // Added isEmailVerified
      const result = await service.login(loginDTO, mockResponse);

      expect(result.status).toBe(404);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Utilisateur non trouvé. Vérifiez votre email.');
    });

    it('should return 401 when email not verified', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedPassword',
        isEmailVerified: false,
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      const loginDTO: LoginDTO = { email: 'test@test.com', password: 'password', isEmailVerified: false }; // Added isEmailVerified
      const result = await service.login(loginDTO, mockResponse);

      expect(result.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Veuillez vérifier votre email avant de vous connecter.');
    });

    it('should return 401 when password is incorrect', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedPassword',
        isEmailVerified: true,
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const loginDTO: LoginDTO = { email: 'test@test.com', password: 'wrongpassword', isEmailVerified: true }; // Added isEmailVerified
      const result = await service.login(loginDTO, mockResponse);

      expect(result.status).toBe(401);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Mot de passe incorrect.');
    });

    it('should return success response when login is valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'hashedPassword',
        nom: 'Doe',
        prenom: 'John',
        isEmailVerified: true,
      };
      const mockJwt = 'mock.jwt.token';

      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockJwt); // Corrected spyOn

      const loginDTO: LoginDTO = { email: 'test@test.com', password: 'password', isEmailVerified: true }; // Added isEmailVerified
      const result = await service.login(loginDTO, mockResponse);

      expect(result.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.jwt).toBe(mockJwt);
      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', mockJwt, expect.objectContaining({ httpOnly: true }));
    });
  });

  describe('verifyEmail', () => {
    it('should throw BadRequestException when token is invalid', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should verify email successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        isEmailVerified: false,
        emailVerificationToken: 'valid-token',
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.verifyEmail('valid-token');

      expect(mockUser.isEmailVerified).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send a verification email', async () => {
      const email = 'test@test.com';
      const token = 'verification-token';
      process.env.VERIFICATION_URL = 'http://localhost:3000/verify';
      process.env.MAIL_HOST = 'smtp.test.com';
      process.env.MAIL_PORT = '587';
      process.env.MAIL_SECURE = 'false';
      process.env.MAIL_USER = 'user@test.com';
      process.env.MAIL_PASSWORD = 'password';

      await service.sendVerificationEmail(email, token);

      const sendMailMock = nodemailer.createTransport().sendMail as jest.Mock;
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith({
        from: process.env.MAIL_USER,
        to: email,
        subject: 'Email Verification',
        text: `Please verify your email by clicking on the following link: ${process.env.VERIFICATION_URL}?token=${token}`,
      });
    });
  });

  describe('forgotPassword', () => {
    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await expect(service.forgotPassword('notfound@test.com')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate reset token for valid user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        resetPasswordToken: null,
        resetPasswordExpire: null,
      };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      jest.spyOn(service, 'sendResetPasswordEmail').mockResolvedValue({
        success: true,
        message: 'Email sent'
      });

      await service.forgotPassword('test@test.com');

      expect(mockUser.resetPasswordToken).toBeDefined();
      expect(mockUser.resetPasswordExpire).toBeDefined();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('resetPassword', () => {
    it('should throw BadRequestException when token is invalid or expired', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword('invalid-token', 'newpassword')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reset password successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        password: 'oldpassword',
        resetPasswordToken: 'valid-token',
        resetPasswordExpire: new Date(Date.now() + 3600000),
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('newhashedpassword' as never);

      await service.resetPassword('valid-token', 'newpassword');

      expect(mockUser.password).toBe('newhashedpassword');
      expect(mockUser.resetPasswordToken).toBeNull();
      expect(mockUser.resetPasswordExpire).toBeNull();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('sendResetPasswordEmail', () => {
    it('should send a reset password email', async () => {
      const email = 'test@test.com';
      const token = 'reset-token';
      process.env.RESET_PASSWORD_URL = 'http://localhost:3000/reset-password';
      process.env.MAIL_HOST = 'smtp.test.com';
      process.env.MAIL_PORT = '587';
      process.env.MAIL_SECURE = 'false';
      process.env.MAIL_USER = 'user@test.com';
      process.env.MAIL_PASSWORD = 'password';

      const result = await service.sendResetPasswordEmail(email, token);

      const sendMailMock = nodemailer.createTransport().sendMail as jest.Mock;
      expect(sendMailMock).toHaveBeenCalledTimes(1);
      expect(sendMailMock).toHaveBeenCalledWith({
        from: process.env.MAIL_USER,
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        text: `Pour réinitialiser votre mot de passe, cliquez sur le lien suivant : ${process.env.RESET_PASSWORD_URL}?token=${token}\nCe lien est valable 1 heure.`, 
      });
      expect(result).toEqual({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
    });
  });

  describe('update', () => {
    it('should update user information', async () => {
      const mockUserDTO: UserDTO = { // Use UserDTO type
        id: 1, // Add id
        nom: 'Updated Nom',
        prenom: 'Updated Prenom',
        email: 'test@test.com',
        password: 'password',
        isEmailVerified: true, // Add isEmailVerified
      };

      await service.update(1, mockUserDTO);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        nom: 'Updated Nom',
        prenom: 'Updated Prenom',
      });
    });
  });
});
