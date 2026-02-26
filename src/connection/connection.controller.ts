import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put, Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { UserDTO } from '../dto/UserDTO';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entity/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

@Controller('connection')
export class ConnectionController {
  constructor(@InjectRepository(User)
              private userRepository: Repository<User>,
              private readonly connectionService: ConnectionService,
              private jwtService: JwtService) {
  }

  @Post('/signup')
  async signup(@Body() user: UserDTO, @Res({ passthrough: true }) res: Response) {
    const { jwt, user: newUser } = await this.connectionService.signup(user); // Get jwt and user from service
    res.cookie('jwt', jwt, { httpOnly: true }); // Set cookie in controller
    return { id: newUser.id, email: newUser.email, nom: newUser.nom, prenom: newUser.prenom, jwt }; // Return relevant user data and jwt
  }

  @Post('/login')
  async login(@Body() user: UserDTO, @Res({ passthrough: true }) res: Response): Promise<void | {
    id: number;
    email: string;
    prenom: string;
    nom: string;
  }> {
    return await this.connectionService.login(user, res).then(value => value).catch((reason) => console.log(reason));
  }

  @Put(':id')
  async update(@Param('id') id, @Body() user: UserDTO, @Body() jwt: { jwt: string }): Promise<void> {
    const data = await this.jwtService.verifyAsync(jwt.jwt, { secret: process.env.secret });
    if (!data) {
      throw new UnauthorizedException();
    }
    // Vérification IDOR : l'utilisateur ne peut modifier que son propre compte
    if (String(data.id) !== String(id)) {
      throw new UnauthorizedException('Accès refusé');
    }
    let str = await this.connectionService.update(id, user);
    return str;
  }

  @Post('user')
  async user(@Body() jwt: { jwt: string }) {
    try {
      const data = await this.jwtService.verifyAsync(jwt.jwt, { secret: process.env.secret });
      if (!data) {
        throw new UnauthorizedException();
      }
      const qb = this.userRepository.createQueryBuilder('User');
      qb.select(['User.id', 'User.nom', 'User.prenom']);
      qb.where({ id: data.id });

      const user = await qb.getOne();

      if (!user) {
        throw new UnauthorizedException();
      }
      return { id: user.id, nom: user.nom, prenom: user.prenom };
    } catch (e) {
      throw new UnauthorizedException();
    }
  }


  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('jwt');

    return {
      message: 'success',
    };
  }

  @Get('decrypt/:token')
  async getId(@Param('token') token: string) {
    const decryptToken = await this.jwtService.verifyAsync(token, { secret: process.env.secret});
    if (!decryptToken) {
      throw new UnauthorizedException();
    }
    return { id: '' + decryptToken?.id };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    await this.connectionService.verifyEmail(token);
    return { message: 'Email successfully verified' };
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.connectionService.forgotPassword(email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string, newPassword: string }) {
    return this.connectionService.resetPassword(body.token, body.newPassword);
  }

  @Get('google')
  async googleAuth(@Res() res: Response) {
    return res.redirect(this.connectionService.getGoogleAuthUrl());
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_denied`);
    }
    try {
      const { jwt, user } = await this.connectionService.handleGoogleCallback(code);
      res.cookie('jwt', jwt, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 86400000 });
      return res.redirect(
        `${process.env.FRONTEND_URL}?jwt=${jwt}&id=${user.id}&email=${encodeURIComponent(user.email)}&nom=${encodeURIComponent(user.nom)}&prenom=${encodeURIComponent(user.prenom)}`,
      );
    } catch (e) {
      console.error('Google OAuth error:', e);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_failed`);
    }
  }
}