import {Body, Controller, Delete, Get, Param, Post, Put} from '@nestjs/common';
import {ActionService} from "./Action.service";
import {ActionDTO} from "../dto/ActionDTO";

@Controller('action')
export class ActionController {
    constructor(private readonly actionService: ActionService) {
    }

    @Get()
    async findAll(): Promise<ActionDTO[]> {
        return await this.actionService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id): Promise<ActionDTO | void> {
        return await this.actionService.findOneBy(id).then(value => value).catch(reason => console.log(reason));
    }

    @Delete(':id')
    async remove(@Param('id') id): Promise<string> {
        await this.actionService.delete(id);
        return 'ok'
    }
    @Put(':id')
    async update(@Param('id') id, @Body() actinDTO:ActionDTO): Promise<string> {
        await this.actionService.update(id, actinDTO);
        return 'ok'
    }

    @Post()
    async create(@Body() actionDTO: ActionDTO) {
        await this.actionService.create(actionDTO)
    }
}
