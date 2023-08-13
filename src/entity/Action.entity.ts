import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {User} from "./User.entity";
import {Categorie} from "./Categorie.entity";
import {QueryDeepPartialEntity} from "typeorm/query-builder/QueryPartialEntity";

@Entity()
export class Action {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    description: string;

    @Column({
        type: 'datetime',
        default: () => 'NOW()',
    })
    dateAjout:Date

    @Column({type: 'datetime', nullable: true,})
    dateTransaction:Date


    @ManyToOne(type => Categorie, categorie => categorie.id) categorie: Categorie;
    @ManyToOne(type => User, user => user.id) user: User;

}