import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Transaction } from './transaction.entity';
import { User } from './user.entity';

@Entity()
export class Envelope {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  month: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ default: '' }) // Champ icône ajouté avec valeur par défaut vide
  icone: string;

  @Column()
  year: number;

  @ManyToOne(() => User, (user) => user.envelopes)
  user: User;

  @OneToMany(() => Transaction, (transaction) => transaction.envelope)
  transactions: Transaction[];
}
