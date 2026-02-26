import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsOptional()
  description: string;

  @IsNumber()
  @IsOptional()
  amount: number;

  @IsOptional()
  date?: Date;

  @IsString()
  @IsOptional()
  envelopeId: string;

  @IsString()
  @IsOptional()
  jwt: string;
}
