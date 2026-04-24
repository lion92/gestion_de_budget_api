import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Action } from './action.entity';

@Entity('ticket_expense')
@Unique('uq_expense', ['expense'])
export class TicketExpense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_id' })
  ticketId: number;

  @ManyToOne(() => Action, { onDelete: 'CASCADE', eager: false })
  expense: Action;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
  user: User;

  @Column({ type: 'json', nullable: true })
  extractedData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
