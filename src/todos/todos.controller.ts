import { Body, Controller, Delete, Get, Param, Post, Put, UnauthorizedException } from '@nestjs/common';
import { TodosService } from './todos.service';
import { TodosInterface } from '../interface/Todos.interface';
import { TodoDTO } from '../dto/todoDTO';
import { JwtService } from '@nestjs/jwt';

@Controller('todos')
export class TodosController {
    constructor(private readonly todos: TodosService, private jwtService:JwtService) {
    }

    @Get()
    async findAll(): Promise<TodosInterface[] | string> {
        return await this.todos.findAll();
    }
    @Get("/byuser/:user/:jwt")
    async findAllByUser(@Param('user') userId): Promise<TodoDTO[] | string> {

        return await this.todos.findByUser(userId);
    }

    @Get(':id')
    async findOne(@Param('id') id): Promise<TodoDTO | void> {
            return await this.todos.findOneBy(id).then(value => value).catch(reason => console.log(reason));
    }

    @Delete(':id')
    async remove(@Param('id') id, @Body() jwt: { jwt: string }): Promise<string> {
        const data = await this.jwtService.verifyAsync(jwt.jwt, {secret: "Je veux pas donner mon mot de passe"});
        if (!data) {
            throw new UnauthorizedException();
        }
        await this.todos.delete(id);
        return 'ok'
    }
    @Put(':id')
    async update(@Param('id') id, @Body() todo:TodoDTO, @Body() jwt: { jwt: string }): Promise<string> {
        const data = await this.jwtService.verifyAsync(jwt.jwt, {secret: "Je veux pas donner mon mot de passe"});
        if (!data) {
            throw new UnauthorizedException();
        }
        await this.todos.update(id, todo);
        return 'ok'
    }

    @Post()
    async create(@Body() todo: TodoDTO, @Body() jwt: { jwt: string }) {
        const data = await this.jwtService.verifyAsync(jwt.jwt, {secret: "Je veux pas donner mon mot de passe"});
        if (!data) {
            throw new UnauthorizedException();
        }
        await this.todos.create(todo)
    }
}
