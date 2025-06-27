export class UpdateTransactionDto {
  description?: string;
  amount?: number;
  date?: Date;
  jwt: string;
}
