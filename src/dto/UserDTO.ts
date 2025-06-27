import { Column } from 'typeorm';

export class UserDTO {
  readonly id: number;
  readonly email: string;
  password: string;
  readonly nom: string;
  readonly prenom: string;
  isEmailVerified:boolean
  jwt?: string;
  resetPasswordToken?:string;
  resetPasswordExpire?: Date;

}