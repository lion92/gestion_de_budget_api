import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {User} from "./User.entity";
import Month from "../dto/enumMonth/Month";


@Entity()
export class Categorie {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    categorie: string;

    @Column()
    color:string

    @Column()
    budgetDebutMois:number

    @Column('text')
    month: Month

    @Column()
    annee:number

    @ManyToOne(() => User, author => User, {
        onDelete: "CASCADE",
        onUpdate:"CASCADE"
    })
    @ManyToOne(type => User, user => user.id) user: User;


}