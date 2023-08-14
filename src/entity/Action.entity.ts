import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {User} from "./User.entity";
import {categorieModule} from "../categorie/Categorie.module";
import {Module} from "@nestjs/common";
import {Categorie} from "./Categorie.entity";

@Module({
    imports: [ categorieModule ]
})


@Entity()
export class Action {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    description: string;

    @Column()
    montant:number

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