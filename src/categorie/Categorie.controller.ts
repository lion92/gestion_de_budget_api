import { Body, Controller, Delete, Get, Param, Post, Put, UnauthorizedException } from '@nestjs/common';

import {CategorieDTO} from "../dto/CategorieDTO";
import {CategorieService} from "./Categorie.service";
import { JwtService } from '@nestjs/jwt';

@Controller('categorie')
export class CategorieController {

    constructor(private readonly connectionService: CategorieService, private jwtService: JwtService) {
    }

    @Get()
    async findAll(): Promise<CategorieDTO[] | string> {
        return await this.connectionService.findAll();
    }

    @Get("/byuser/:user")
    async findAllByUser(@Param('user') userId): Promise<CategorieDTO[] | string> {
        return await this.connectionService.findByUser(userId);
    }

    @Get(':id')
    async findOne(@Param('id') id): Promise<CategorieDTO | void> {
        return await this.connectionService.findOneBy(id).then(value => value).catch(reason => console.log(reason));
    }

    @Delete(':id')
    async remove(@Param('id') id,@Body() jwt: { jwt: string }): Promise<string> {
        const data = await this.jwtService.verifyAsync(jwt.jwt, {secret: "Je veux pas donner mon mot de passe"});
        if (!data) {
            throw new UnauthorizedException();
        }
        await this.connectionService.delete(id);
        return 'ok'
    }
    @Put(':id')
    async update(@Param('id') id, @Body() categorieDTO:CategorieDTO): Promise<string> {
        const data = await this.jwtService.verifyAsync(categorieDTO.jwt, {secret: "Je veux pas donner mon mot de passe"});
        if (!data) {
            throw new UnauthorizedException();
        }
        await this.connectionService.update(id, categorieDTO);
        return 'ok'
    }

    @Post()
    async create(@Body() categorieDTO: CategorieDTO,@Body() jwt: { jwt: string }) {
        const data = await this.jwtService.verifyAsync(jwt.jwt, {secret: "Je veux pas donner mon mot de passe"});
        if (!data) {
            throw new UnauthorizedException();
        }
        await this.connectionService.create(categorieDTO)
    }
}
