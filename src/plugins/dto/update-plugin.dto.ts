//para actualizar un plugin, NestJs recomienda PartialType para que no sea obligatorio enviar todos los campos
import { PartialType } from '@nestjs/mapped-types';
import { CreatePluginDto } from './create-plugin.dto';

export class UpdatePluginDto extends PartialType(CreatePluginDto) {}
