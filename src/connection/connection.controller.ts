import {Body, Controller, Get, Param, Post, Put, Req, Res, UnauthorizedException} from '@nestjs/common';
import {ConnectionService} from './connection.service';
import {UserDTO} from '../dto/UserDTO';
import {Request, Response} from 'express';
import {JwtService} from "@nestjs/jwt";
import {Repository} from "typeorm";
import {User} from "../entity/User.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {Action} from "../entity/Action.entity";

@Controller('connection')
export class ConnectionController {
    constructor(@InjectRepository(User)
                private userRepository: Repository<User>,
                private readonly connectionService: ConnectionService,
                private jwtService: JwtService) {
    }

    @Post('signup')
    async signup(@Body() user: UserDTO, @Res({passthrough: true}) res: Response) {
        await this.connectionService
            .signup(user, res)
            .catch((reason) => console.log(reason));
        return 'ok';
    }

    @Post('/login')
    async login(@Body() user: UserDTO, @Res({passthrough: true}) res: Response): Promise<void | { id: number; email: string; prenom: string; nom: string; }> {
        return await this.connectionService.login(user, res).then(value => console.log(value)).catch((reason) => console.log(reason));
    }

    @Put(':id')
    async update(@Param('id') id, @Body() user: UserDTO): Promise<void> {
        let str = await this.connectionService.update(id, user);
        return str;
    }

    @Get('user')
    async user(@Req() request: Request) {
        try {
            const cookie = request.cookies['jwt'];

            const data = await this.jwtService.verifyAsync(cookie, {secret: "Je veux pas donner mon mot de passe"});
            console.log(data)
            if (!data) {
                throw new UnauthorizedException();
            }
            let qb = this.userRepository.createQueryBuilder("User")
            qb.select("id, nom, prenom")
            qb.where({id: data.id})
            console.log(qb.getSql())

            const user = await qb.execute();

            const {password, ...result} = user;

            return result;
        } catch (e) {
            console.log(e);
            throw new UnauthorizedException();
        }
    }


    @Post('logout')
    async logout(@Res({passthrough: true}) response: Response) {
        response.clearCookie('jwt');

        return {
            message: 'success'
        }
    }
}
