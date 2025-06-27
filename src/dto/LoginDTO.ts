export class LoginDTO {
  readonly email: string;
  readonly password: string;
  isEmailVerified: boolean;
  jwt?: string;
}