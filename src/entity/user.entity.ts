import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Revenue } from './revenue.entity';
import { Envelope } from './envelope.entity';
import { Ticket } from './ticket.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  password: string;
  @Column({ unique: true })
  email: string;
  @Column()
  nom: string;
  @Column()
  prenom: string;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  @OneToMany(() => Revenue, (revenue) => revenue.user)
  revenues: Revenue[];

  @OneToMany(() => Envelope, (envelope) => envelope.user)
  envelopes: Envelope[];

  @OneToMany(() => Ticket, (ticket) => ticket.user, { cascade: true })
  tickets: Ticket[];

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  resetPasswordExpire: Date;
}
