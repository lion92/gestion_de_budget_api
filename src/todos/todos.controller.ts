import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { TodosInterface } from '../interface/Todos.interface';
import { TodoDTO } from '../dto/todoDTO';
import { JwtService } from '@nestjs/jwt';
import { FileInterceptor } from '@nestjs/platform-express';
import e from 'express';
import { diskStorage } from 'multer';

@Controller('todos')
export class TodosController {
  constructor(
    private readonly todos: TodosService,
    private jwtService: JwtService,
  ) {
  }

  @Get()
  async findAll(): Promise<TodosInterface[] | string> {
    return await this.todos.findAll();
  }

  @Get('/byuser/:user')
  async findAllByUser(@Param('user') userId): Promise<TodoDTO[] | string> {
    return await this.todos.findByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id): Promise<TodoDTO | void> {
    return await this.todos
      .findOneBy(id)
      .then((value) => value)
      .catch((reason) => console.log(reason));
  }

  @Delete(':id')
  async remove(@Param('id') id, @Body() jwt: { jwt: string }): Promise<string> {
    const data = await this.jwtService.verifyAsync(jwt.jwt, {
      secret: 'Je veux pas donner mon mot de passe',
    });
    if (!data) {
      throw new UnauthorizedException();
    }
    await this.todos.delete(id);
    return 'ok';
  }

  @Put(':id')
  async update(
    @Param('id') id,
    @Body() todo: TodoDTO,
    @Body() jwt: { jwt: string },
  ): Promise<string> {
    const data = await this.jwtService.verifyAsync(jwt.jwt, {
      secret: 'Je veux pas donner mon mot de passe',
    });
    if (!data) {
      throw new UnauthorizedException();
    }
    await this.todos.update(id, todo);
    return 'ok';
  }

  @Post()
  async create(@Body() todo: TodoDTO, @Body() jwt: { jwt: string }) {
    const data = await this.jwtService.verifyAsync(jwt.jwt, {
      secret: 'Je veux pas donner mon mot de passe',
    });
    if (!data) {
      throw new UnauthorizedException();
    }
    await this.todos.create(todo);
  }

  @Get('pictures/:filename')
  async getPicture({ fileName, res }: { fileName: any; res: e.Response }) {
    res.sendFile(fileName, { root: './uploads' });
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: '../../uploads',
      storage: diskStorage({
        destination: '../../uploads',
        filename: (req, file, cb) => {
          cb(null, file.originalname);
        },
      }),
    }),
  )
  async local(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
    return {
      statusCode: 200,
      data: file.path,
    };
  }
}
