import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.secret,
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.id },
      });

      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      if (user.email !== process.env.ADMIN_EMAIL) {
        throw new UnauthorizedException('Accès administrateur requis');
      }

      request.user = user;
    } catch {
      throw new UnauthorizedException('Token invalide');
    }

    return true;
  }

  private extractTokenFromCookie(request: any): string | undefined {
    return request.cookies?.jwt;
  }
}