import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  texte: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @CreateDateColumn()
  dateAjout: Date;

  // Nouveaux champs pour les données extraites (optionnels)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalExtrait?: number;

  @Column({ nullable: true })
  dateTicket?: string;

  @Column({ nullable: true })
  commercant?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sousTotal?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  tva?: number;

  // SOLUTION 1: Utiliser TEXT au lieu de JSON pour la compatibilité
  @Column({ type: 'text', nullable: true })
  articlesJson?: string; // Stocker JSON comme string

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confianceOCR?: number;

  // Méthodes helper pour gérer le JSON manuellement
  get articles(): Array<{name: string, price: number, quantity?: number}> | undefined {
    if (!this.articlesJson) return undefined;
    try {
      return JSON.parse(this.articlesJson);
    } catch {
      return undefined;
    }
  }

  set articles(value: Array<{name: string, price: number, quantity?: number}> | undefined) {
    this.articlesJson = value ? JSON.stringify(value) : null;
  }
}
