import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @CreateDateColumn({ type: 'timestamp' }) // ❌ PAS de `default`
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' }) // ❌ PAS de `default`
  updatedAt: Date;

  @ManyToOne(type => User, user => user.id) user: User;

}