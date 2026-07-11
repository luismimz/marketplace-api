// backend-sexchapero/src/email/dto/create-template.dto.ts
/**
 * DTO para crear plantillas de email.
 * - Usa enums tipados para evitar strings sueltos.
 * - Incluye ejemplos Swagger para que /api/docs sea útil.
 * - 'replacements' lista las variables soportadas por la plantilla (metadatos, no valores).
 */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { EmailContentType, EmailType } from './email.enums';

export class CreateTemplateDto {
  @ApiProperty({
    example: 'welcome_user',
    description: 'Clave única (slug) de la plantilla',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    example: 'Bienvenido a la plataforma',
    description: 'Asunto del email',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    example: 'Hola {{userName}}',
    required: false,
    description: 'Versión texto plano',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    example: '<p>Hola <strong>{{userName}}</strong></p>',
    required: false,
    description: 'Versión HTML',
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiProperty({
    enum: EmailContentType,
    example: EmailContentType.BOTH,
    description: 'Contenido disponible en la plantilla (text, html o both)',
  })
  @IsEnum(EmailContentType)
  contentType: EmailContentType;

  @ApiProperty({
    enum: EmailType,
    example: EmailType.TRANSACTIONAL,
    description:
      'Clasificación funcional del email (critical, transactional, info, marketing)',
  })
  @IsEnum(EmailType)
  emailType: EmailType;

  @ApiProperty({
    required: false,
    example: ['siteName', 'userName', 'activationLink'],
    description:
      'Variables soportadas por la plantilla (metadatos para documentar placeholders).',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  replacements?: string[];
}
