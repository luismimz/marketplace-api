import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsDateString,
} from 'class-validator';
import { MinAge } from '../../common/validators/min-age.validator';

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@example.com',
    description: 'Correo electrónico único del usuario.',
  })
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @ApiProperty({
    example: 'chico_guapo21',
    description: 'Nombre de usuario único.',
  })
  @IsString()
  @IsNotEmpty({ message: 'El username es obligatorio.' })
  username: string;

  @ApiProperty({
    example: 'P@ssw0rd123',
    description: 'Contraseña con mínimo 8 caracteres.',
  })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  @ApiPropertyOptional({
    example: '+34600111222',
    description: 'Número de teléfono con prefijo internacional.',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: '1995-04-10',
    description:
      'Fecha de nacimiento en formato ISO (YYYY-MM-DD). Debe ser mayor de 18 años.',
  })
  @IsDateString(
    {},
    { message: 'dateOfBirth debe ser una fecha ISO válida (YYYY-MM-DD).' },
  )
  @MinAge(18, { message: 'Debes ser mayor de 18 años para registrarte.' })
  dateOfBirth: string;
}
