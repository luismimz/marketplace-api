import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { EmailContentType, EmailType } from './email.enums';

/**
 * DTO para actualización parcial de plantillas.
 * Usa enums centralizados para coherencia con CreateTemplateDto.
 * No incluye key (identidad inmutable).
 */
export class UpdateTemplateDto {
  @ApiPropertyOptional({
    example: 'Bienvenido actualizado',
    description: 'Nuevo asunto del email',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    example: 'Hola {{userName}} actualizado',
    description: 'Nueva versión texto plano',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    example: '<p>Hola <strong>{{userName}}</strong> actualizado</p>',
    description: 'Nueva versión HTML',
  })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({
    enum: EmailContentType,
    example: EmailContentType.BOTH,
    description: 'Actualizar tipo de contenido (text/html/both)',
  })
  @IsOptional()
  @IsEnum(EmailContentType)
  contentType?: EmailContentType;

  @ApiPropertyOptional({
    enum: EmailType,
    example: EmailType.TRANSACTIONAL,
    description: 'Reclasificar propósito del email',
  })
  @IsOptional()
  @IsEnum(EmailType)
  emailType?: EmailType;

  @ApiPropertyOptional({
    example: ['siteName', 'userName', 'activationLink'],
    description: 'Reemplaza la lista declarativa de variables soportadas',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  replacements?: string[];
}
