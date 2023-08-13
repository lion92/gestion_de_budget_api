import {Body, Controller, Delete, Get, Param, Post, Put} from '@nestjs/common';

import {CategorieDTO} from "../dto/CategorieDTO";
import {CategorieService} from "./Categorie.service";

@Controller('categorie')
export class CategorieController {
    constructor(private readonly connectionService: CategorieService) {
    }

    @Get()
    async findAll(): Promise<CategorieDTO[] | string> {
        return await this.connectionService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id): Promise<CategorieDTO | void> {
        return await this.connectionService.findOneBy(id).then(value => value).catch(reason => console.log(reason));
    }

    @Delete(':id')
    async remove(@Param('id') id): Promise<string> {
        await this.connectionService.delete(id);
        return 'ok'
    }
    @Put(':id')
    async update(@Param('id') id, @Body() categorieDTO:CategorieDTO): Promise<string> {
        await this.connectionService.update(id, categorieDTO);
        return 'ok'
    }

    @Post()
    async create(@Body() categorieDTO: CategorieDTO) {
        await this.connectionService.create(categorieDTO)
    }
}
