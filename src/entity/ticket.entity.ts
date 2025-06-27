// src/entity/ticket.entity.ts
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  texte: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateAjout: Date;

  @ManyToOne(() => User, (user) => user.tickets, { eager: true })
  user: User;
}
