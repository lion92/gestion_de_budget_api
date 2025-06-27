import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { Envelope } from '../entity/envelope.entity';
import { User } from '../entity/user.entity';

@Injectable()
export class EnvelopesService {
  constructor(
    @InjectRepository(Envelope)
    private readonly envelopeRepo: Repository<Envelope>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(
    name: string,
    amount: number,
    userId: number,
    month: number,
    year: number,
    icone: string,
  ): Promise<Envelope> {
    console.log(userId);
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const iconCode = icone ? icone.codePointAt(0)?.toString(16).toUpperCase() : '';
    const envelope = this.envelopeRepo.create({
      name,
      amount,
      user,
      month,
      year,
      icone: iconCode, // ✅ ici c'est bien "icone"
    });

    return this.envelopeRepo.save(envelope);
  }

  async update(
    id: string,
    newName: string,
    newAmount?: number,
    icone?:string
  ): Promise<Envelope> {
    const envelope = await this.envelopeRepo.findOneBy({ id });
    if (!envelope) {
      throw new NotFoundException('Enveloppe non trouvée');
    }
    const iconCode = icone ? icone.codePointAt(0)?.toString(16).toUpperCase() : '';
    envelope.name = newName;
    if (newAmount !== undefined) {
      envelope.amount = newAmount;
    }
    if (iconCode !== undefined) {
      envelope.icone = iconCode;
    }

    return this.envelopeRepo.save(envelope);
  }

  async delete(id: string): Promise<void> {
    const result = await this.envelopeRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Enveloppe non trouvée');
    }
  }

  async findByUserAndMonth(
    userId: number,
    month: number,
    year: number,
  ): Promise<Envelope[]> {
    return this.envelopeRepo.find({
      where: {
        user: { id: userId },
        month,
        year,
      },
      relations: ['transactions'],
      order: { name: 'ASC' },
    });
  }
}
