import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';


@Entity()
export class Revenue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('int')
  amount: number;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => User, (user) => user.revenues, { onDelete: 'CASCADE' })
  user: User;
}
