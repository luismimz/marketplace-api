import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/email/email.service';
import { RegisterDto } from './dto/register.dto';
import {
  Prisma,
  BillingCycle,
  SubscriptionStatus,
  UserType,
  OnboardingStatus,
} from '@prisma/client';
/**
 * Estructura de la selección de Gate 1.
 * - planKey: identificador del plan (p. ej., 'BASIC', 'PRO', 'AGENCY_START')
 * - billingCycle: 'monthly' | 'yearly'
 * - activateOnPlatforms: subdominios o keys de otras webs donde activar (upsell multi‑web)
 * - addons: otros upsells (p. ej., 'featured', 'prioritySupport', etc.)
 */
type Gate1Selection = {
  planKey: string;
  billingCycle: 'monthly' | 'yearly';
  activateOnPlatforms?: string[];
  addons?: string[];
};
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService, // Inyecta EmailService si es necesario
  ) {}
  /** Crea un código numérico tipo PIN (por defecto 6 dígitos) */
  private generatePin(length = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  /** REGISTRO con verificación por código (email PIN) */
  async register(dto: RegisterDto) {
    // 1) Hash de contraseña
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 2) Generar PIN y caducidad (15 minutos)
    const code = this.generatePin(6);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    // 3) Crear usuario
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          password: hashedPassword,
          phone: dto.phone ?? null,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,

          // tu enum de tipo ya existe como "type: UserType?"
          // si lo envías en el dto (opcional), lo guardamos
          type: (dto as any).type ?? null,

          // onboarding por defecto ya es REGISTERED según tu schema
          emailVerified: false,
          emailVerificationCode: code,
          emailVerificationExpiresAt: expiry,

          phoneVerified: false,
          role: ['user'],
          isOnline: false,
          isVerified: false,
          isBanned: false,
          isBlocked: false,
        },
        select: {
          id: true,
          email: true,
          username: true,
          emailVerified: true,
          emailVerificationExpiresAt: true,
        },
      });

      // 4) Enviar el PIN por email (temporalmente llamado de forma opcional)
      try {
        // En el siguiente paso implementaremos EmailService.sendVerificationCode
        (this.emailService as any)?.sendVerificationCode?.(user.email, code);
      } catch (e) {
        // No rompemos el registro si el envío falla ahora mismo
        console.warn(
          'Pendiente implementar sendVerificationCode en EmailService:',
          e,
        );
      }

      // (Opcional en desarrollo) log del PIN para pruebas locales
      if (process.env.NODE_ENV !== 'production') {
        console.log('[DEV] Verification PIN for', user.email, '=>', code);
      }

      return {
        message:
          'Registro creado. Revisa tu correo e introduce el código de verificación.',
        next: 'verify-email',
        userId: user.id,
        // en prod NO retornes el código; en dev podrías devolverlo
      };
    } catch (err: any) {
      // Manejo rápido de errores de unicidad
      if (err?.code === 'P2002') {
        throw new BadRequestException('Email o username ya en uso.');
      }
      throw err;
    }
  }

  /** Verifica el email con el código PIN */
  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    if (user.emailVerified) {
      return { message: 'El email ya estaba verificado.' };
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException(
        'No hay un código activo. Solicita reenvío.',
      );
    }

    const now = new Date();
    if (user.emailVerificationExpiresAt < now) {
      throw new BadRequestException('El código ha expirado. Solicita reenvío.');
    }

    if (user.emailVerificationCode !== code) {
      throw new UnauthorizedException('Código incorrecto.');
    }

    // OK: verificar y limpiar campos de PIN
    await this.prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationExpiresAt: null,
        // Si quisieras avanzar onboarding aquí, se podría:
        // OnboardingStatus: 'PLAN_SELECTED', // <- tu campo se llama con mayúscula inicial
      },
    });

    return { message: 'Email verificado correctamente.' };
  }

  /** Reenvía un nuevo PIN (si el email aún no está verificado) */
  async resendVerificationCode(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    if (user.emailVerified) {
      return { message: 'El email ya está verificado.' };
    }

    const code = this.generatePin(6);
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: {
        emailVerificationCode: code,
        emailVerificationExpiresAt: expiry,
      },
    });

    try {
      (this.emailService as any)?.sendVerificationCode?.(email, code);
    } catch (e) {
      console.warn(
        'Pendiente implementar sendVerificationCode en EmailService:',
        e,
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] NEW Verification PIN for', email, '=>', code);
    }

    return { message: 'Se envió un nuevo código de verificación a tu correo.' };
  }
  /**
   * Guarda la selección de Gate 1 (plan + upsells) creando/actualizando una Subscription PENDING.
   * Deja al usuario en OnboardingStatus = PLAN_SELECTED.
   * YA NO usa customFields.
   */
  async saveGate1Selection(
    userId: number,
    selection: {
      planKey: string;
      billingCycle: 'monthly' | 'yearly';
      activateOnPlatforms?: string[];
      addons?: string[];
    },
  ) {
    // 1) Usuario
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { id: true, emailVerified: true, type: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.emailVerified)
      throw new ForbiddenException(
        'Debes verificar tu email antes de continuar.',
      );

    // 2) Validación básica del payload
    if (!selection?.planKey)
      throw new BadRequestException('planKey es obligatorio.');
    if (
      !selection?.billingCycle ||
      !['monthly', 'yearly'].includes(selection.billingCycle)
    ) {
      throw new BadRequestException(
        'billingCycle debe ser "monthly" o "yearly".',
      );
    }
    const cycle =
      selection.billingCycle === 'yearly'
        ? BillingCycle.YEARLY
        : BillingCycle.MONTHLY;

    // 3) Plan
    const plan = await this.prisma.plan.findUnique({
      where: { key: String(selection.planKey) },
      select: { id: true, key: true, applicableTo: true, isActive: true },
    });
    if (!plan)
      throw new NotFoundException(`Plan no encontrado: ${selection.planKey}`);
    if (!plan.isActive)
      throw new BadRequestException(`El plan ${plan.key} no está activo.`);

    // 4) Coincidencia de tipo (si el usuario tiene type definido)
    if (user.type && plan.applicableTo && user.type !== plan.applicableTo) {
      throw new BadRequestException(
        `El plan ${plan.key} es para ${plan.applicableTo}, pero el usuario es ${user.type}.`,
      );
    }

    // 5) Buscar una Subscription PENDING existente del usuario
    const pending = await this.prisma.subscription.findFirst({
      where: { userId: user.id, status: SubscriptionStatus.PENDING },
      select: { id: true },
    });

    const data = {
      userId: user.id,
      planId: plan.id,
      billingCycle: cycle,
      status: SubscriptionStatus.PENDING,
      autoRenew: true,
      addons: selection.addons ?? [],
      activateOnPlatforms: selection.activateOnPlatforms ?? [],
    } as const;

    let subscription;

    if (pending) {
      // actualizar la pendiente existente
      subscription = await this.prisma.subscription.update({
        where: { id: pending.id },
        data: {
          planId: data.planId,
          billingCycle: data.billingCycle,
          addons: data.addons as any,
          activateOnPlatforms: data.activateOnPlatforms as any,
        },
        include: { plan: true },
      });
    } else {
      // crear una nueva pendiente
      subscription = await this.prisma.subscription.create({
        data: { ...data },
        include: { plan: true },
      });
    }

    // 6) Avanzar OnboardingStatus
    await this.prisma.user.update({
      where: { id: user.id },
      data: { OnboardingStatus: OnboardingStatus.PLAN_SELECTED },
    });

    return {
      message: 'Selección de plan guardada en Subscription (PENDING).',
      onboardingStatus: 'PLAN_SELECTED',
      subscription: {
        id: subscription.id,
        planKey: subscription.plan.key,
        billingCycle: subscription.billingCycle, // enum
        addons: subscription.addons,
        activateOnPlatforms: subscription.activateOnPlatforms,
        status: subscription.status,
      },
    };
  }
  /**
   * Crea una Subscription PENDING a partir de la selección guardada en Gate 1 (customFields.gate1).
   * NO crea el Payment aún. Eso lo hará el módulo payments al elegir método.
   */
  async createSubscriptionFromGate1(userId: number) {
    // 1) Cargar usuario con lo necesario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        emailVerified: true,
        type: true, // CLIENT | ESCORT | AGENCY (puede ser null)
        customFields: true, // aquí está gate1
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.emailVerified)
      throw new ForbiddenException(
        'Debes verificar tu email antes de continuar.',
      );

    // 2) Extraer selección de Gate1
    const cf = (user.customFields ?? {}) as Record<string, any>;
    const gate1 = cf.gate1 ?? null;

    if (!gate1?.planKey || !gate1?.billingCycle) {
      throw new BadRequestException('Falta selección de plan (Gate 1).');
    }

    // Normalizar ciclo a enum de Prisma
    const billingCycle =
      String(gate1.billingCycle).toLowerCase() === 'yearly'
        ? BillingCycle.YEARLY
        : BillingCycle.MONTHLY;

    // 3) Encontrar Plan por key
    const plan = await this.prisma.plan.findUnique({
      where: { key: String(gate1.planKey) },
      select: { id: true, key: true, applicableTo: true },
    });
    if (!plan)
      throw new NotFoundException(`Plan no encontrado: ${gate1.planKey}`);

    // 4) Validar que el plan aplica al tipo de usuario (si type es null, permitimos de momento)
    if (user.type && plan.applicableTo && user.type !== plan.applicableTo) {
      throw new BadRequestException(
        `El plan ${plan.key} es para ${plan.applicableTo}, pero el usuario es ${user.type}.`,
      );
    }

    // 5) Crear Subscription PENDING
    const subscription = await this.prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        billingCycle,
        status: SubscriptionStatus.PENDING,
        autoRenew: true,
        addons: gate1.addons ?? [],
        activateOnPlatforms: gate1.activateOnPlatforms ?? [],
        // startedAt/expiresAt se fijarán cuando confirmemos el pago
      },
      include: {
        plan: true,
      },
    });

    // (Opcional) Mantener gate1 en customFields como historial.
    // Si quisieras limpiarlo: await this.prisma.user.update({ where:{id:user.id}, data:{ customFields: {...cf, gate1: undefined } } })

    return {
      message: 'Suscripción creada en estado PENDING a partir de Gate 1.',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planKey: subscription.plan.key,
        billingCycle: subscription.billingCycle,
        addons: subscription.addons,
        activateOnPlatforms: subscription.activateOnPlatforms,
      },
      next: 'choose-payment-method', // siguiente paso: crear Payment según método
    };
  }

  // enviar enlace mágico
  async sendMagicLink(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new UnauthorizedException('Config JWT_SECRET ausente');
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret, expiresIn: '15m' },
    );
    // (Opcional) Guardar hash del token para invalidación futura
    await this.emailService.sendMagicLink(email, token);
    return { message: 'Magic link enviado', expiresIn: '15m' };
  }
  async validateUser(identifier: string, password: string) {
    console.log('Validando usuario con identificador:', identifier);
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
    console.log('Usuario encontrado:', user ? user.id : null);
    if (!user) {
      console.log('Usuario no encontrado');
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Contraseña válida:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('Contraseña incorrecta');
      throw new UnauthorizedException('Contraseña incorrecta');
    }
    return user;
  }

  // Método 2: login con JWT (o por ahora simple)
  async login(user: { id: number; email: string; username?: string; role?: string[] | string; password?: string }) {
    console.log('Iniciando sesión para el usuario:', user.email);
  const payload = { sub: user.id, email: user.email, role: user.role };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '1h', // Puedes ajustar el tiempo de expiración según tus necesidades
      algorithm: 'HS256', // Asegúrate de que el algoritmo coincida con tu configuración de JWT
    });
    console.log('Token generado:', token);
    // Devuelve el token y los datos del usuario
    console.log('Login exitoso para el usuario:', user.email);
    console.log('Datos del usuario:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role, // Asegúrate de que el modelo de usuario tenga un campo 'role'
    });
    // Aquí puedes devolver el token y los datos del usuario

    return {
      message: 'Login correcto',
      access: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }
  async loginWithMagicLink(token: string) {
    try {
      console.log('Iniciando sesión con enlace mágico, token:', token);
      // Verifica el token JWT
      if (!token) {
        throw new UnauthorizedException('Token no proporcionado');
      }
      // Verifica el token y extrae el payload
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new UnauthorizedException('Config JWT_SECRET ausente');
  const payload = this.jwtService.verify(token, { secret });
      console.log('Payload del token:', payload);
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Token inválido');
      }
      // Busca al usuario por el email del payload
      console.log('Buscando usuario con email:', payload.email);
      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }
      //si todo es correcto, devuelve el usuario
  const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
      return {
        message: 'Login exitoso con enlace mágico',
        access: accessToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      };
    } catch (error) {
      console.error('Error al iniciar sesión con enlace mágico:', error);
      // Maneja el error de verificación del token
      if (error instanceof UnauthorizedException) {
        throw error; // Re-lanza la excepción si ya es UnauthorizedException
      }
      // Si el token es inválido o ha expirado, lanza UnauthorizedException
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
