import {Column, Entity, PrimaryGeneratedColumn} from 'typeorm';

@Entity()
export class Categorie {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    categorie: string;

    @Column()
    color:string

    @Column()
    description: string;
}