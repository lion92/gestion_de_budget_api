import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RevenueDto {
  @IsString()
  @IsOptional()
  readonly name: string;

  @IsNumber()
  @IsOptional()
  readonly amount: number;

  @IsString()
  @IsOptional()
  readonly date: string;
}
