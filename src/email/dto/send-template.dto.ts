import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { EmailType } from './email.enums';

/**
 * DTO para solicitar el envío de una plantilla.
 * contentType NO se pide aquí: lo define la plantilla almacenada.
 * emailType se acepta para forzar/registrar la clasificación (legacy values se mapearán).
 */
export class SendTemplateDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Destinatario principal',
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    example: 'welcome_user',
    description: 'Clave (key) de la plantilla',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: {
      userName: 'Luis',
      activationLink: 'https://app/activate?code=123',
    },
    description: 'Mapa de variables -> valores para renderizar la plantilla',
  })
  @IsObject()
  @IsNotEmpty()
  replacements: Record<string, string>;

  @ApiProperty({
    enum: EmailType,
    example: EmailType.TRANSACTIONAL,
    required: false,
    description:
  'Clasificación funcional del email (critical | transactional | info | marketing).',
  })
  @IsOptional()
  @IsEnum(EmailType, { message: 'emailType debe ser un EmailType válido' })
  emailType?: EmailType;
}
