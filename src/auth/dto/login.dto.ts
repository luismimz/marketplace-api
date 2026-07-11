import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  identifier: string; //puede ser email o username

  @IsString()
  @MinLength(6)
  password: string;
}
