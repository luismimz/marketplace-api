//valida lo que llega a la API, protege contra inyecciones y errores en BBDD
//y facilita el trabajo del administrador del panel de control y frontend.
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsJSON,
} from 'class-validator';

export class CreatePluginDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  type: string; // Por ejemplo, 'chat', 'video', etc.

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsNotEmpty()
  config: any; // Configuración adicional del plugin, puede ser un objeto JSON

  @IsString()
  @IsOptional()
  version?: string; // Versión del plugin, opcional

  @IsString()
  @IsOptional()
  description?: string; // Descripción del plugin, opcional
}
