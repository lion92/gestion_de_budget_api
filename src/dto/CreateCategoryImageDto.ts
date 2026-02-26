import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoryImageDto {
  @IsNumber()
  @IsOptional()
  categoryId: number;

  @IsString()
  @IsOptional()
  iconName: string;

  @IsString()
  @IsOptional()
  jwt?: string;
}
