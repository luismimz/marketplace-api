import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UserType } from '@prisma/client';
import { CreatePlanDto } from './create-plan.dto';

/**
 * UpdatePlanDto: igual que CreatePlanDto pero
 * - todas las propiedades opcionales
 * - NO incluye 'key' (no renombramos aquí)
 */
export class UpdatePlanDto extends PartialType(
  OmitType(CreatePlanDto, ['key'] as const),
) {
  @ApiPropertyOptional({
    example: 'Escort PRO',
    description: 'Nombre visible del plan.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'Plan profesional con posicionamiento destacado.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    enum: UserType,
    example: UserType.ESCORT,
    description: 'A qué tipo de cuenta aplica el plan.',
  })
  @IsOptional()
  @IsEnum(UserType, {
    message: 'applicableTo debe ser CLIENT, ESCORT o AGENCY.',
  })
  applicableTo?: UserType;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 29.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0)
  monthlyPrice?: number;

  @ApiPropertyOptional({ example: 290.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0)
  yearlyPrice?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
