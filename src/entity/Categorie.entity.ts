import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {User} from "./User.entity";

@Entity()
export class Categorie {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    categorie: string;

    @Column()
    color:string

    @ManyToOne(() => User, author => User, {
        onDelete: "CASCADE",
        onUpdate:"CASCADE"
    })
    @ManyToOne(type => User, user => user.id) user: User;


}