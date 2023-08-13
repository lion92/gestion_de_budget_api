import {Body, Controller, Delete, Get, Param, Post, Put} from '@nestjs/common';
import {TodosService} from "./todos.service";
import {TodosInterface} from "../interface/Todos.interface";
import {TodoDTO} from "../dto/todoDTO";
import {CategorieDTO} from "../dto/CategorieDTO";

@Controller('todos')
export class TodosController {
    constructor(private readonly todos: TodosService) {
    }

    @Get()
    async findAll(): Promise<TodosInterface[] | string> {
        return await this.todos.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id): Promise<TodoDTO | void> {
            return await this.todos.findOneBy(id).then(value => value).catch(reason => console.log(reason));
    }

    @Delete(':id')
    async remove(@Param('id') id): Promise<string> {
        await this.todos.delete(id);
        return 'ok'
    }
    @Put(':id')
    async update(@Param('id') id, @Body() todo:TodoDTO): Promise<string> {
        await this.todos.update(id, todo);
        return 'ok'
    }

    @Post()
    async create(@Body() todo: TodoDTO) {
        await this.todos.create(todo)
    }
}
