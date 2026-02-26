import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Post('login')
  async login(@Body() loginDto: { username: string; password: string }) {
    const { username, password } = loginDto;

    // Simple authentication with toto/toto
    if (username === 'toto' && password === 'toto') {
      return {
        success: true,
        message: 'Authentification réussie',
        token: 'admin-authenticated',
      };
    }

    throw new UnauthorizedException('Identifiants incorrects');
  }

  @Get('users')
  async getAllUsers() {
    const users = await this.userRepository.find({
      select: ['id', 'email', 'nom', 'prenom', 'phoneNumber', 'isEmailVerified'],
      order: { id: 'DESC' },
    });

    return users;
  }

}
