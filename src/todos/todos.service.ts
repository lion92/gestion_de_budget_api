import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Todo } from '../entity/todo.entity';
import { TodoDTO } from '../dto/todoDTO';

@Injectable()
export class TodosService {
  constructor(
    @InjectRepository(Todo)
    private todoRepository: Repository<Todo>,
  ) {}

  async findAll(): Promise<Todo[]> {
    return this.todoRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneBy(id: number): Promise<Todo | null> {
    return this.todoRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async delete(id: number): Promise<void> {
    await this.todoRepository.delete(id);
    console.log('Todo supprimé');
  }

  async create(todo: TodoDTO): Promise<Todo> {
    const newTodo = this.todoRepository.create(todo);
    return this.todoRepository.save(newTodo);
  }

  async update(id: number, todo: TodoDTO): Promise<void> {
    await this.todoRepository.update(id, {
      title: todo.title,
      description: todo.description,
      user: todo.user,
    });
  }

  async findByUser(userId: number): Promise<any[]> {
    const qb = this.todoRepository.createQueryBuilder('tache');
    qb.select([
      'tache.id AS id',
      'tache.title AS title',
      'tache.description AS description',
      'tache.createdAt AS createdAt',
      'tache.updatedAt AS updatedAt',
      'user.id AS userId',
      'user.nom AS nom',
      'user.prenom AS prenom',
    ])
      .innerJoin('tache.user', 'user')
      .where('user.id = :userId', { userId })
      .orderBy('tache.createdAt', 'DESC');

    console.log(qb.getSql());
    return qb.execute();
  }
}
