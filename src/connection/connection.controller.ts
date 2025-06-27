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

  @Post('signup')
  async signup(@Body() user: UserDTO, @Res({ passthrough: true }) res: Response) {
    await this.connectionService
      .signup(user, res)
      .catch((reason) => console.log(reason));
    return 'ok';
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
    let str = await this.connectionService.update(id, user);
    return str;
  }

  @Post('user')
  async user(@Body() jwt: { jwt: string }) {
    try {
      await console.log(jwt);
      const data = await this.jwtService.verifyAsync(jwt.jwt, { secret: process.env.secret });
      await console.log(data);
      if (!data) {
        throw new UnauthorizedException();
      }
      let qb = await this.userRepository.createQueryBuilder('User');
      await qb.select('id, nom, prenom');
      await qb.where({ id: data.id });
      await console.log(qb.getSql());

      const user = await qb.execute();

      const { password, ...result } = await user;
      await console.log(user[0]);
      await console.log('ee');
      return { id: user[0].id, nom: user[0].nom, prenom: user[0].prenom };
    } catch (e) {
      console.log(e);
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
}
