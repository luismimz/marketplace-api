// src/plans/dto/create-plan.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UserType } from '@prisma/client';

export class CreatePlanDto {
  @ApiProperty({
    example: 'ESCORT_PRO',
    description: 'Clave única del plan (en MAYÚSCULAS, sin espacios).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  key!: string;

  @ApiProperty({
    example: 'Escort PRO',
    description: 'Nombre visible del plan.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 'Plan profesional con posicionamiento destacado.',
    description: 'Descripción corta del plan.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: UserType,
    example: UserType.ESCORT,
    description: 'A qué tipo de cuenta aplica el plan.',
  })
  @IsEnum(UserType, {
    message: 'applicableTo debe ser CLIENT, ESCORT o AGENCY.',
  })
  applicableTo!: UserType;

  @ApiProperty({
    example: 'EUR',
    description: 'Moneda del plan.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  currency!: string;

  @ApiProperty({
    example: 29.0,
    description: 'Precio mensual.',
  })
  @IsNumber()
  @IsPositive()
  @Min(0)
  monthlyPrice!: number;

  @ApiProperty({
    example: 290.0,
    description: 'Precio anual.',
  })
  @IsNumber()
  @IsPositive()
  @Min(0)
  yearlyPrice!: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el plan está activo para su venta.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
