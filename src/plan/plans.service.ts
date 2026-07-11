import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, UserType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un plan en la BBDD.
   * - Normaliza key/currency en MAYÚSCULAS.
   * - Convierte los precios a Decimal (Prisma).
   * - Lanza 400 si la key ya existe.
   */
  async create(dto: CreatePlanDto) {
    const key = dto.key.trim().toUpperCase();
    const currency = dto.currency.trim().toUpperCase();
    const name = dto.name.trim();
    const description = dto.description?.trim() || null;

    try {
      const plan = await this.prisma.plan.create({
        data: {
          key,
          name,
          description,
          applicableTo: dto.applicableTo, // enum UserType
          currency,
          monthlyPrice: new Prisma.Decimal(dto.monthlyPrice),
          yearlyPrice: new Prisma.Decimal(dto.yearlyPrice),
          isActive: dto.isActive ?? true,
        },
      });

      return {
        message: 'Plan creado correctamente.',
        plan,
      };
    } catch (e: any) {
      // P2002 = unique constraint failed (key duplicada)
      if (e?.code === 'P2002') {
        throw new BadRequestException('Ya existe un plan con esa clave (key).');
      }
      throw e;
    }
  }
  /**Actualizamos un plan existente
   * De momento no permite cambiar el Key, solo los ccampos del DTO
   */
  async update(id: number, dto: UpdatePlanDto) {
    //1.verificamos existencia
    const existing = await this.prisma.plan.findUnique({
      where: { id: Number(id) },
    });
    if (!existing) {
      throw new BadRequestException('Plan no encontrado.');
    }
    //2.preparamos los datos para la actualización
    const data: Prisma.PlanUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description.trim();
    if (dto.applicableTo !== undefined) data.applicableTo = dto.applicableTo;
    if (dto.currency !== undefined) data.currency = dto.currency.trim();
    if (dto.monthlyPrice !== undefined)
      data.monthlyPrice = new Prisma.Decimal(dto.monthlyPrice);
    if (dto.yearlyPrice !== undefined)
      data.yearlyPrice = new Prisma.Decimal(dto.yearlyPrice);
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    //3.realizamos la actualización
    const plan = await this.prisma.plan.update({
      where: { id: Number(id) },
      data,
    });
    return {
      message: 'Plan actualizado correctamente.',
      plan,
    };
  }
  /**
   * Lista de planes con paginación y filtros sencillos.
   * params:
   *  - page (1..n), pageSize (1..100)
   *  - search (busca en key, name, description)
   *  - applicableTo (CLIENT | ESCORT | AGENCY)
   *  - isActive (true/false)
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    applicableTo?: UserType;
    isActive?: boolean;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.PlanWhereInput = {};

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { key: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (params.applicableTo) {
      where.applicableTo = params.applicableTo;
    }

    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /** Detalle de plan por ID */
  async findOne(id: number) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: Number(id) },
    });
    if (!plan) {
      throw new BadRequestException('El plan no existe.');
    }
    return plan;
  }
}
