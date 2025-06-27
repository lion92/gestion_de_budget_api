import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Categorie } from './categorie.entity';

@Entity()
export class CategoryImage {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Categorie)
  @JoinColumn()
  categorie: Categorie; // ✅ minuscule ici, correspond au nom dans le service

  @Column()
  iconName: string;

  @OneToOne(() => CategoryImage, (categoryImage) => categoryImage.categorie)
  categoryImage: CategoryImage;
}
