import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../entity/user.entity';
import { AdminGuard } from '../guards/admin.guard';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get('users')
  async getAllUsers() {
    const users = await this.userRepository.find({
      select: ['id', 'email', 'nom', 'prenom', 'isEmailVerified', 'lastLoginAt', 'loginCount', 'googleId'],
      order: { lastLoginAt: 'DESC' },
    });
    return users;
  }

  @Get('stats')
  async getStats() {
    const total = await this.userRepository.count();
    const verified = await this.userRepository.count({ where: { isEmailVerified: true } });

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const active24h = await this.userRepository.count({ where: { lastLoginAt: MoreThan(since24h) } });
    const active7d  = await this.userRepository.count({ where: { lastLoginAt: MoreThan(since7d)  } });
    const active30d = await this.userRepository.count({ where: { lastLoginAt: MoreThan(since30d) } });

    const recentUsers = await this.userRepository.find({
      select: ['id', 'email', 'nom', 'prenom', 'lastLoginAt', 'loginCount', 'googleId'],
      where: { lastLoginAt: MoreThan(since7d) },
      order: { lastLoginAt: 'DESC' },
      take: 20,
    });

    return { total, verified, active24h, active7d, active30d, recentUsers };
  }
}
