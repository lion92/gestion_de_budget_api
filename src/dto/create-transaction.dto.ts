export class CreateTransactionDto {
  description: string;
  amount: number;
  date?: Date;
  envelopeId: string;
  jwt: string;
}
