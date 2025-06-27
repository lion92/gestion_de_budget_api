import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import Month from '../dto/enumMonth/Month';
import { CategoryImage } from './categorieImage.entity';


@Entity()
export class Categorie {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  categorie: string;

  @Column()
  color: string;

  @Column()
  budgetDebutMois: number;

  @Column('text')
  month: Month;

  @Column()
  annee: number;

  @ManyToOne(() => User, author => User, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @ManyToOne(type => User, user => user.id) user: User;

  @OneToOne(() => CategoryImage, (image) => image.categorie)
  @JoinColumn({ name: 'categorieId' }) // ou le nom correct de la colonne de jointure
  categoryImage: CategoryImage;
}