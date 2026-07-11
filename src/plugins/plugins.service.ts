import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePluginDto } from './dto/create-plugin.dto';
import { UpdatePluginDto } from './dto/update-plugin.dto';

// Si más adelante quieres auditar acciones, puedes importar EventEmitter y logs aquí

@Injectable()
export class PluginsService {
  constructor(private prisma: PrismaService) {}

  // Crea un nuevo plugin
  async create(createPluginDto: CreatePluginDto) {
    // Valida que el 'key' sea único
    const exists = await this.prisma.plugin.findUnique({
      where: { key: createPluginDto.key },
    });
    if (exists)
      throw new BadRequestException(
        'Ya existe un plugin con este key. Usa uno diferente.',
      );
    // Crea el plugin en la BBDD
    return this.prisma.plugin.create({ data: createPluginDto });
  }

  // Lista plugins con paginación, filtros y soporte a soft delete
  async findAll(params: {
    page?: number;
    limit?: number;
    name?: string;
    type?: string;
    active?: boolean;
    includeDeleted?: boolean; // Nuevo: para admins avanzados
  }) {
    const {
      page = 1,
      limit = 20,
      name,
      type,
      active,
      includeDeleted = false,
    } = params;
    const skip = (page - 1) * limit;

    // Filtros dinámicos
    const where: Prisma.PluginWhereInput = {};
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (type) where.type = type;
    if (typeof active === 'boolean') where.active = active;
    if (!includeDeleted) where.deletedAt = null; // Solo no eliminados

    const [results, total] = await Promise.all([
      this.prisma.plugin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plugin.count({ where }),
    ]);

    return {
      results,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // Busca un plugin por ID (no muestra los soft deleted por defecto)
  async findOne(id: number, showDeleted = false) {
    const where: Prisma.PluginWhereUniqueInput = { id };
    const plugin = await this.prisma.plugin.findUnique({ where });
    if (!plugin || (!showDeleted && plugin.deletedAt))
      throw new NotFoundException('Plugin no encontrado');
    return plugin;
  }

  // Actualiza un plugin
  async update(id: number, updatePluginDto: UpdatePluginDto) {
    // Evita editar plugins eliminados
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin || plugin.deletedAt)
      throw new NotFoundException('Plugin no encontrado o eliminado');
    // Si intentan cambiar el key, valida duplicidad
    if (updatePluginDto.key && updatePluginDto.key !== plugin.key) {
      const exists = await this.prisma.plugin.findUnique({
        where: { key: updatePluginDto.key },
      });
      if (exists)
        throw new BadRequestException(
          'Ya existe un plugin con ese key, no se puede duplicar.',
        );
    }
    // Actualiza el registro
    return this.prisma.plugin.update({
      where: { id },
      data: updatePluginDto,
    });
  }

  // Soft delete (marca como eliminado, no borra de BBDD)
  async remove(id: number, userId?: number) {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin || plugin.deletedAt)
      throw new NotFoundException('Plugin no encontrado o ya eliminado');

    // Opcional: guardar quién hizo la eliminación (userId)
    // Aquí puedes emitir un evento/log

    return this.prisma.plugin.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Hard delete (elimina completamente, solo para superadmin)
  async hardDelete(id: number) {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin) throw new NotFoundException('Plugin no encontrado');
    return this.prisma.plugin.delete({ where: { id } });
  }

  // Reactiva un plugin eliminado (restaura el soft delete)
  async restore(id: number) {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin || !plugin.deletedAt)
      throw new NotFoundException('Plugin no eliminado o ya activo');
    return this.prisma.plugin.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  // Activa o desactiva el plugin (sin eliminar)
  async toggleActive(id: number, active: boolean) {
    const plugin = await this.prisma.plugin.findUnique({ where: { id } });
    if (!plugin || plugin.deletedAt)
      throw new NotFoundException('Plugin no encontrado o eliminado');
    return this.prisma.plugin.update({
      where: { id },
      data: { active },
    });
  }
}
