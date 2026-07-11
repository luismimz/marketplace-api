import {
  Controller,
  Query,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { TemplateService } from './template.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';

// La gestión de plantillas de email usa contentType para especificar si la plantilla es html/text/both.
// NO se maneja emailType aquí, sólo en los logs/envíos.

@ApiTags('Plantillas de Email')
@ApiBearerAuth()
@Controller('email/templates')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'moderator')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @ApiOperation({ summary: 'Crear una nueva plantilla de correo electrónico' })
  @ApiBody({ type: CreateTemplateDto })
  @ApiResponse({ status: 201, description: 'Plantilla creada.' })
  @Post()
  create(@Body() dto: CreateTemplateDto) {
    // contentType: 'text' | 'html' | 'both' debe estar presente en dto
    return this.templateService.create(dto);
  }

  @ApiOperation({ summary: 'Listar todas las plantillas de email' })
  @ApiQuery({
    name: 'contentType',
    required: false,
    description: 'Filtrar por tipo de contenido (text, html, both)',
  })
  @ApiResponse({ status: 200, description: 'Lista de plantillas.' })
  @Get()
  findAll(@Query('contentType') contentType?: string) {
    // Filtra por contentType si se proporciona, por ejemplo /email/templates?contentType=html
    return this.templateService.findAll(contentType);
  }

  @ApiOperation({ summary: 'Ver detalles de una plantilla de email' })
  @ApiParam({ name: 'id', description: 'ID de la plantilla' })
  @ApiResponse({ status: 200, description: 'Detalle de la plantilla.' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templateService.findOne(id);
  }

  @ApiOperation({ summary: 'Actualizar una plantilla de email' })
  @ApiParam({ name: 'id', description: 'ID de la plantilla' })
  @ApiBody({ type: UpdateTemplateDto })
  @ApiResponse({ status: 200, description: 'Plantilla actualizada.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    // contentType sólo si necesitas cambiar el formato (html/text/both)
    return this.templateService.update(id, dto);
  }

  @ApiOperation({ summary: 'Eliminar una plantilla de email' })
  @ApiParam({ name: 'id', description: 'ID de la plantilla' })
  @ApiResponse({ status: 200, description: 'Plantilla eliminada.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templateService.remove(id);
  }
}
