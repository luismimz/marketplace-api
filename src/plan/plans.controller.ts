import {
  Body,
  Controller,
  Post,
  UseGuards,
  Patch,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Admin / Plans')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard) // Nota: en el próximo paso añadimos RolesGuard para exigir "admin"
@Roles('admin') // Solo usuarios con rol 'admin' pueden acceder a este controlador
@Controller('admin/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un plan (solo admin)' })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({ status: 201, description: 'Plan creado correctamente.' })
  @ApiResponse({
    status: 400,
    description: 'Validación incorrecta o key duplicada.',
  })
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un plan (solo admin)' })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del plan a actualizar',
  })
  //@ApiBody({ type: UpdatePlanDto })
  @ApiResponse({ status: 200, description: 'Plan actualizado correctamente.' })
  @ApiResponse({
    status: 400,
    description: 'Validación incorrecta o plan no encontrado.',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.plansService.update(id, dto);
  }
}
