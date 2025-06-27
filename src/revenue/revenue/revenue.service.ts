import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Revenue } from '../../entity/revenue.entity';
import { RevenueDto } from '../../dto/Revenue.dto';


@Injectable()
export class RevenueService {
  constructor(
    @InjectRepository(Revenue)
    private revenueRepository: Repository<Revenue>,
  ) {}

  async create(dto: RevenueDto, userId: number) {
    const revenue = this.revenueRepository.create({
      ...dto,
      user: { id: userId },
    });
    return this.revenueRepository.save(revenue);
  }

  async findAll(userId: number) {
    return this.revenueRepository.find({
      where: { user: { id: userId } },
      order: { date: 'DESC' },
    });
  }

  async update(id: number, dto: RevenueDto, userId: number) {
    const revenue = await this.revenueRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!revenue) throw new NotFoundException('Revenu non trouvé');

    Object.assign(revenue, dto);
    return this.revenueRepository.save(revenue);
  }

  async remove(id: number, userId: number) {
    const revenue = await this.revenueRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!revenue) throw new NotFoundException('Revenu non trouvé');

    return this.revenueRepository.remove(revenue);
  }
  // revenue.service.ts

  async findOne(id: number, userId: number) {
    const revenue = await this.revenueRepository.findOne({
      where: { id, user: { id: userId } },
    });

    if (!revenue) {
      throw new NotFoundException('Revenu non trouvé');
    }

    return revenue;
  }

}
