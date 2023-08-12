
import {Entity, Column, PrimaryGeneratedColumn, ManyToOne} from 'typeorm';
import {User} from "./User.entity";

@Entity()
export class Todo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column()
    description: string;

    @ManyToOne(type => User, user => user.id) user: User;

}