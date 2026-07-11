/**
 * Data Transfer Object for Magic Login functionality.
 * se usa para validar y tipar los datos necesarios para el inicio de sesión mágico.
 * POST /auth/magic-login, gracias a los decoradores de swagger y class-validator.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class MagicLoginDto {
  /** correo del usuario para inicio de sesión mágico
   * se valida como email y se limita el tamalo para ecitar playloads excesivos */
  @ApiProperty({
    description: 'Correo electrónico del usuario para inicio de sesión mágico',
    example: 'correo@ejemplo.com',
  })
  @IsEmail({}, {message: 'Email inválido.' })
  @MaxLength(254, { message: 'El email es demasiado largo.' })
  email!: string;
}