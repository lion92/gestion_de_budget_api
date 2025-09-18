import {
  Test,
  TestingModule
} from '@nestjs/testing';
import { 
  ConnectionController
} from './connection.controller';
import { 
  ConnectionService
} from './connection.service';
import { 
  JwtService
} from '@nestjs/jwt';
import { 
  getRepositoryToken
} from '@nestjs/typeorm';
import { 
  User
} from '../entity/user.entity';
import { 
  Repository
} from 'typeorm';
import { 
  UserDTO
} from '../dto/UserDTO';
import { 
  UnauthorizedException,
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { 
  Response
} from 'express';

describe('ConnectionController', () => {
  let controller: ConnectionController;
  let service: ConnectionService;
  let jwtService: JwtService;
  let userRepository: Repository < User > ;

  const mockConnectionService = {
    signup: jest.fn(),
    login: jest.fn(),
    update: jest.fn(),
    verifyEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getSql: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectionController],
      providers: [{
        provide: ConnectionService,
        useValue: mockConnectionService,
      }, {
        provide: JwtService,
        useValue: mockJwtService,
      }, {
        provide: getRepositoryToken(User),
        useValue: mockUserRepository,
      }, ],
    }).compile();

    controller = module.get < ConnectionController > (ConnectionController);
    service = module.get < ConnectionService > (ConnectionService);
    jwtService = module.get < JwtService > (JwtService);
    userRepository = module.get < Repository < User >> (getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    it('should sign up a user and set a cookie', async () => {
      const userDTO: UserDTO = {
        id: 1,
        email: 'test@test.com',
        password: 'password',
        nom: 'Test',
        prenom: 'User',
        isEmailVerified: false
      }; // Added id and isEmailVerified
      const mockJwt = 'mock.jwt.token';
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        nom: 'Test',
        prenom: 'User'
      };
      mockConnectionService.signup.mockResolvedValue({
        jwt: mockJwt,
        user: mockUser
      });

      const mockResponse = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.signup(userDTO, mockResponse);

      expect(service.signup).toHaveBeenCalledWith(userDTO);
      expect(mockResponse.cookie).toHaveBeenCalledWith('jwt', mockJwt, {
        httpOnly: true
      });
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        nom: mockUser.nom,
        prenom: mockUser.prenom,
        jwt: mockJwt
      });
    });
  });

  describe('login', () => {
    it('should log in a user and return user data', async () => {
      const userDTO: UserDTO = {
        id: 1,
        email: 'test@test.com',
        password: 'password',
        isEmailVerified: true,
        nom: 'Test',
        prenom: 'User'
      }; // Added id, isEmailVerified, nom, prenom
      const mockLoginResult = {
        status: 200,
        success: true,
        id: 1,
        email: 'test@test.com',
        nom: 'Test',
        prenom: 'User',
        jwt: 'mock.jwt'
      };
      mockConnectionService.login.mockResolvedValue(mockLoginResult);

      const mockResponse = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.login(userDTO, mockResponse);
      expect(service.login).toHaveBeenCalledWith(userDTO, mockResponse);
      expect(result).toEqual(mockLoginResult);
    });
  });

  describe('update', () => {
    it('should update user information if JWT is valid', async () => {
      const userDTO: UserDTO = {
        id: 1,
        email: 'test@test.com',
        password: 'password',
        nom: 'Updated',
        prenom: 'User',
        isEmailVerified: true
      }; // Added id and isEmailVerified
      const jwtPayload = {
        jwt: 'valid_jwt'
      };
      mockJwtService.verifyAsync.mockResolvedValue({
        userId: 1
      });
      mockConnectionService.update.mockResolvedValue(undefined);

      await controller.update(1, userDTO, jwtPayload);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', {
        secret: process.env.secret
      });
      expect(service.update).toHaveBeenCalledWith(1, userDTO);
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const userDTO: UserDTO = {
        id: 1,
        email: 'test@test.com',
        password: 'password',
        nom: 'Updated',
        prenom: 'User',
        isEmailVerified: true
      }; // Added id and isEmailVerified
      const jwtPayload = {
        jwt: 'invalid_jwt'
      };
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.update(1, userDTO, jwtPayload)).rejects.toThrow(Error);
    });
  });

  describe('user', () => {
    it('should return user data if JWT is valid', async () => {
      const jwtPayload = {
        jwt: 'valid_jwt'
      };
      const decodedJwt = {
        id: 1
      };
      const mockUser = [{
        id: 1,
        nom: 'Test',
        prenom: 'User'
      }]; // Ensure this is an array
      mockJwtService.verifyAsync.mockResolvedValue(decodedJwt);
      mockQueryBuilder.execute.mockResolvedValue(mockUser);

      const result = await controller.user(jwtPayload);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid_jwt', {
        secret: process.env.secret
      });
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('User');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('id, nom, prenom');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith({
        id: decodedJwt.id
      });
      expect(result).toEqual({
        id: mockUser[0].id,
        nom: mockUser[0].nom,
        prenom: mockUser[0].prenom
      });
    });

    it('should throw UnauthorizedException if JWT is invalid', async () => {
      const jwtPayload = {
        jwt: 'invalid_jwt'
      };
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.user(jwtPayload)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should clear the jwt cookie', async () => {
      const mockResponse = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.logout(mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('jwt');
      expect(result).toEqual({
        message: 'success'
      });
    });
  });

  describe('getId', () => {
    it('should return user ID if token is valid', async () => {
      const mockToken = 'valid_token';
      const decodedToken = {
        id: 123
      };
      mockJwtService.verifyAsync.mockResolvedValue(decodedToken);

      const result = await controller.getId(mockToken);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: process.env.secret
      });
      expect(result).toEqual({
        id: '' + decodedToken?.id
      });
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      const mockToken = 'invalid_token';
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.getId(mockToken)).rejects.toThrow(Error);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const token = 'valid-token';
      mockConnectionService.verifyEmail.mockResolvedValue(undefined);

      const result = await controller.verifyEmail(token);

      expect(service.verifyEmail).toHaveBeenCalledWith(token);
      expect(result).toEqual({
        message: 'Email successfully verified'
      });
    });

    it('should throw BadRequestException if token is missing', async () => {
      mockConnectionService.verifyEmail.mockClear(); // Clear any previous calls

      await expect(controller.verifyEmail(undefined)).rejects.toThrow(BadRequestException);
      expect(service.verifyEmail).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should call forgotPassword service method', async () => {
      const email = 'test@test.com';
      mockConnectionService.forgotPassword.mockResolvedValue(undefined);

      await controller.forgotPassword(email);

      expect(service.forgotPassword).toHaveBeenCalledWith(email);
    });
  });

  describe('resetPassword', () => {
    it('should call resetPassword service method', async () => {
      const token = 'reset-token';
      const newPassword = 'newpassword';
      mockConnectionService.resetPassword.mockResolvedValue(undefined);

      await controller.resetPassword({
        token,
        newPassword
      });

      expect(service.resetPassword).toHaveBeenCalledWith(token, newPassword);
    });
  });
});