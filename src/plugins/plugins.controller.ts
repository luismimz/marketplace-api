//El controlador expone la Api rest, recibe las peticiones del panel admin/frontend ,
//recoge y valida los datos usando los DTOs y llama a los metodos del serivicio.
import {
  Controller,
  UseGuards,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { CreatePluginDto } from './dto/create-plugin.dto';
import { UpdatePluginDto } from './dto/update-plugin.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt')) // Protege las rutas con JWT
@Controller('plugins')
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Post() // Endpoint para crear un nuevo plugin
  async create(@Body() createPluginDto: CreatePluginDto) {
    return this.pluginsService.create(createPluginDto);
  }

  // Endpoint para listar con paginación y filtros
  // Puedes usar Query para recibir parámetros de consulta
  // Por ejemplo, ?page=1&limit=10 para paginación
  // y ?name=pluginName para filtrar por nombre
  // Puedes usar DefaultValuePipe para establecer valores por defecto
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('name') name?: string,
    @Query('type') type?: string,
    @Query('active') active?: boolean,
    @Query('includeDeleted') includeDeleted?: boolean,
  ) {
    //convierte los strings a booleanos "true" o "false" reales
    const parseActive = typeof active === 'string' ? active === 'true' : active;
    const parseIncludeDeleted =
      typeof includeDeleted === 'string'
        ? includeDeleted === 'true'
        : includeDeleted;
    return this.pluginsService.findAll({
      page,
      limit,
      name,
      type,
      active: parseActive,
      includeDeleted: parseIncludeDeleted,
    });
  }
  //optener un plugin por id
  //usando ParseIntPipe para validar que el id es un número entero
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pluginsService.findOne(id);
  }
  //actualizar un plugin por id
  //usando ParseIntPipe para validar que el id es un número entero
  //y UpdatePluginDto para validar los datos de actualización
  //el DTO UpdatePluginDto debe contener las propiedades que se pueden actualizar
  //y las validaciones necesarias
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePluginDto: UpdatePluginDto,
  ) {
    return this.pluginsService.update(id, updatePluginDto);
  }
  // Soft delete un plugin por id (marcarlo como eliminado)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.pluginsService.remove(id);
  }
  // restaurar un plugin por id (desmarcarlo como eliminado)
  @Patch(':id/restore')
  async restore(@Param('id', ParseIntPipe) id: number) {
    return this.pluginsService.restore(id);
  }
  // Endpoint para eliminar un plugin de forma permanente
  @Delete(':id/hard')
  async hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.pluginsService.hardDelete(id);
  }
  // Endpoint para activar o desactivar un plugin por id
  @Patch(':id/active')
  async toggleActive(
    @Param('id', ParseIntPipe) id: number,
    @Body('active') active: boolean,
  ) {
    return this.pluginsService.toggleActive(id, active);
  }
}
