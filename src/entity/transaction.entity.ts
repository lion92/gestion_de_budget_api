import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Envelope } from './envelope.entity';


@Entity()
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  date: Date;

  @ManyToOne(() => Envelope, (envelope) => envelope.transactions, { onDelete: 'CASCADE' })
  envelope: Envelope;
}
