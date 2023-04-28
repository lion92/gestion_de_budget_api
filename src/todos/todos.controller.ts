import {Body, Controller, Delete, Get, Param, Post} from '@nestjs/common';
import {TodosService} from "./todos.service";
import {TodosInterface} from "../interface/Todos.interface";
import {TodoDTO} from "../dto/todoDTO";

@Controller('todos')
export class TodosController {
    constructor(private readonly todos: TodosService) {
    }
    @Get()
    async findAll(): Promise<TodosInterface[]> {
        return await this.todos.findAll();
    }
    @Get(':id')
    async findOne(@Param('id') id): Promise<TodosInterface> {
        return await this.todos.findOneBy(id);
    }

    @Delete()
    async remove(id: number): Promise<void> {
        await this.todos.delete(id);
    }
    @Post()
    async create(@Body() todo:TodoDTO){
        await this.todos.create(todo)
    }
}
