import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  BadRequestException,
  Res,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { date } from 'joi';

//Dto pequeños para verificacion y reenvio (sólo aqui)
class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  code: string;
}
class ResendCodeDto {
  @IsEmail()
  email: string;
}
class Gate1Dto {
  /* Identificador del Plan (p. ej., 'BASIC', 'PRO', 'AGENCY_START') */
  @IsNotEmpty()
  planKey: string;
  /* Ciclo de facturación: 'monthly' | 'yearly' */
  billingCycle: 'monthly' | 'yearly';
  /* Subdominios o keys de otras webs donde activar (upsell multi‑web) */
  activateOnPlatforms?: string[];
  /* Otros upsells (p. ej., 'featured', 'prioritySupport', etc.) */
  addons?: string[];
}
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registro de usuario (+18 con verificacion por código)',
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      basic: {
        summary: 'Ejemplo válido',
        value: {
          email: 'usuario@example.com',
          username: 'usuario',
          password: 'ContraseñaSegura123',
          phone: '+3464567890',
          dateOfBirth: '1990-01-01',
          //type adicional como 'Escort', 'Usuario', etc.
          //type: 'ESCORT'
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado correctamente; se envia PIN por email.',
  })
  @ApiResponse({ status: 400, description: 'Validacion fallida o duplicado.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verificación de email con PIN' })
  @ApiBody({
    type: VerifyEmailDto,
    examples: {
      basic: {
        summary: 'Verificacion con PIN',
        value: { email: 'usuario@example.com', code: '123456' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Email verificado correctamente.' })
  @ApiResponse({
    status: 400,
    description: 'Código de verificación inválido o expirado.',
  })
  @ApiResponse({ status: 401, description: 'Usuario o código no encontrado.' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Post('resend-code')
  @ApiOperation({ summary: 'Reenviar código de verificación' })
  @ApiBody({
    type: ResendCodeDto,
    examples: {
      basic: {
        summary: 'Reenvío de código',
        value: { email: 'usuario@example.com' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Código reenviado correctamente.' })
  @ApiResponse({ status: 400, description: 'Email no encontrado o válido.' })
  @ApiResponse({ status: 401, description: 'Usuario no encontrado.' })
  resendCode(@Body() dto: ResendCodeDto) {
    return this.authService.resendVerificationCode(dto.email);
  }
  @ApiBearerAuth() // <- Swagger mostrara el candado (usar boton Authorize)
  @UseGuards(AuthGuard('jwt'))
  @Post('gate1/select-plan')
  @ApiOperation({ summary: 'Gate1 - Selección de Plan + Upsells' })
  @ApiBody({
    type: Gate1Dto,
    examples: {
      basic: {
        summary: 'Ejemplo escort PRO anual con multi-web y destacado',
        value: {
          planKey: 'ESCORT_PRO',
          billingCycle: 'yearly',
          activateOnPlatforms: ['sexchapero.com', 'smender.com'],
          addons: ['featured'],
        },
      },
      agency: {
        summary: 'Ejemplo agencia START mensual sin upsells',
        value: {
          planKey: 'AGENCY_START',
          billingCycle: 'monthly',
          activateOnPlatforms: ['sexchapero.com'],
          addons: ['prioritySupport'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Selección de plan guardada.' })
  @ApiResponse({ status: 403, description: 'Email sin verificar:bloqueado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  saveGate1Selection(@Req() req: any, @Body() body: Gate1Dto) {
    const userId =
      req.user?.sub ?? req.user?.id ?? req.user?.userId ?? req.user?.uid; // ID de usuario desde el token JWT
    if (!userId) {
      throw new UnauthorizedException('No se pudo obtener el ID de usuario.');
    }
    return this.authService.saveGate1Selection(userId, {
      planKey: body.planKey,
      billingCycle: body.billingCycle,
      activateOnPlatforms: body.activateOnPlatforms,
      addons: body.addons,
    });
  }
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('gate1/create-subscription')
  @ApiOperation({
    summary: 'Crear Subscription (PENDING) desde la selección de Gate 1',
  })
  @ApiResponse({
    status: 200,
    description: 'Suscripción creada en estado PENDING.',
  })
  @ApiResponse({ status: 400, description: 'Falta selección o plan inválido.' })
  @ApiResponse({ status: 401, description: 'No autenticado.' })
  @ApiResponse({ status: 403, description: 'Email no verificado.' })
  @ApiResponse({ status: 404, description: 'Usuario o plan no encontrado.' })
  async createSubscriptionFromGate1(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? req.user?.uid;

    if (!userId)
      throw new UnauthorizedException(
        'No se pudo obtener el userId del token.',
      );

    return this.authService.createSubscriptionFromGate1(Number(userId));
  }
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.identifier,
      loginDto.password,
    );
    return this.authService.login(user);
  }
  @Post('magic-login')
  @ApiOperation({
    summary: 'Enviar enlace de inicio de sesión mágico por email',
    description:
      'Recibe un email y, si corresponde, envía un enlace mágico de acceso. La respuesta es genérica por seguridad.',
  })
  @ApiBody({  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud aceptada. Si el email existe, se enviará un enlace de acceso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Email inválido (fallo de validación del DTO).',
  })
  async sendMagicLink(@Body('email') email: string) {
    return this.authService.sendMagicLink(email);
  }
  @Get('magic-login')
  async magicLogin(@Query('token') token: string, @Res() res: Response) {
    if (!token) {
      throw new BadRequestException('Token no proporcionado');
    }

    const result = await this.authService.loginWithMagicLink(token);
    return res.status(200).json(result);
    //return res.redirect(`${this.config.get('FRONTEND_URL')}/login-success?token=${token}`);
  }
}
