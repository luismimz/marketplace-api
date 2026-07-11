import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { SendTemplateDto } from './dto/send-template.dto';
import { EmailType } from './dto/email.enums';
import { Request } from 'express';

interface RequestUser {
  userId: number;
  email: string;
  role: string;
}
interface AuthedRequest extends Request {
  user?: RequestUser;
}
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('email')
@ApiBearerAuth()
@Controller('email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {} // Inyectamos la cola de BullMQ para manejar los trabajos de envío de correos
  @ApiOperation({
    summary:
      'Ver estado de la cola de correos (pendientes, fallidos, completos, etc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen del estado de la cola de emails',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Get('queue/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Protege la ruta con AuthGuard y RolesGuard
  @Roles('admin', 'moderator') // Solo usuarios con roles 'admin' o 'moderator' pueden acceder
  async getEmailQueueStatus() {
    // mostramos el estado de la cola de correos: pendientes, en proceso y completados
    return {
      waiting: await this.emailQueue.getWaitingCount(), // Correos pendientes
      active: await this.emailQueue.getActiveCount(), // Correos en proceso
      completed: await this.emailQueue.getCompletedCount(), // Correos completados
      failed: await this.emailQueue.getFailedCount(), // Correos fallidos
      delayed: await this.emailQueue.getDelayedCount(), // Correos retrasados
      paused: await this.emailQueue.isPaused(), // Si la cola está pausada
    };
  }
  /**
   * Ruta para enviar un correo electronico a partir de una plantilla
   * se usa la clave KEY de la plantilla y un objeto de reemplazo de variable
   */
  @ApiOperation({
    summary: 'Enviar un correo electrónico usando una plantilla',
  })
  @ApiBody({ type: SendTemplateDto })
  @ApiResponse({ status: 201, description: 'Correo enviado correctamente' })
  @Post('send-template')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Protege la ruta con AuthGuard y RolesGuard
  @Roles('admin', 'moderator') // Solo usuarios con roles 'admin' o 'moderator' pueden acceder
  async sendTemplateEmail(@Req() req: AuthedRequest, @Body() body: SendTemplateDto) {
    const { key, to, replacements, emailType } = body;
    if (!key || !to || !replacements || Object.keys(replacements).length === 0) {
      throw new BadRequestException('key, to y replacements (no vacío) son obligatorios');
    }
    const jobId = await this.emailService.enqueueEmailJob(key, {
      to,
      replacements,
      sentById: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      emailType,
    });
    return {
      success: true,
      message: 'Correo encolado',
      key,
      to,
      emailType: emailType ?? EmailType.TRANSACTIONAL,
      jobId,
    };
  }

  //Obtener los logs de correos electrónicos enviados
  @ApiOperation({ summary: 'Ver logs de los emails (paginados y filtrables)' })
  @ApiQuery({
    name: 'emailType',
    required: false,
    description: 'Tipo de correo (opcional)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Tipo de correo (opcional)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Correo destinatario (opcional)',
  })
  @ApiQuery({
    name: 'sentById',
    required: false,
    description: 'ID del usuario que envió (opcional)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Estado del envío (opcional)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Límite de registros',
    type: Number,
    example: 30,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Desplazamiento para paginación',
    type: Number,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs de correos electrónicos',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'No se encontraron logs de correos electrónicos',
  })
  @Get('logs')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Protege la ruta con AuthGuard y RolesGuard
  @Roles('admin', 'moderator') // Solo usuarios con roles 'admin' o 'moderator' pueden acceder
  async getEmailLogs(
    @Query('emailType') emailType?: string, // Tipo de correo (opcional)
    @Query('to') to?: string, // Correo destinatario (opcional)
    @Query('sentById') sentById?: number, // ID del usuario que envió (opcional)
    @Query('status') status?: string, // Estado del envío (opcional)
    @Query('limit') limit: number = 30, // Límite de registros
    @Query('offset') offset: number = 0, // Desplazamiento para paginacion
  ) {
    //filtros admitidos
    const where: any = {};
    if (emailType) where.emailType = emailType;
    if (to) where.to = to;
    if (sentById) where.sentById = Number(sentById);
    if (status) where.status = status;

    const logs = await this.emailService.getLogs(
      where,
      Number(limit),
      Number(offset),
    );
    return logs;
  }

  //Reprocesar un correo electrónico fallido y/o modificar el destinatario
  @ApiOperation({
    summary:
      'Reprocesar un email enviado y fallido (reenviar/cambiar destinatario)',
  })
  @ApiBody({
    schema: {
      properties: {
        id: {
          type: 'number',
          example: 23,
          description: 'ID del email log a procesar',
        },
        to: {
          type: 'string',
          example: 'nuevo@email.com',
          description: 'Nuevo Destinatario',
        },
      },
      required: ['id'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Correo reprocesado correctamente',
    schema: {
      example: {
        success: true,
        message: 'Correo reprocesado correctamente',
        to: 'nuevo@correo.com',
        logId: 123,
        subject: 'Asunto del correo',
        key: 'clave-de-la-plantilla',
        html: '<p>Contenido HTML del correo</p>',
        text: 'Contenido de texto del correo',
  emailType: 'critical',
        replacements: { nombre: 'valor1', edad: 'valor2' },
        status: 'pending', // Indicamos que el correo está en proceso de envío
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Falta el ID del correo a reprocesar o no se encontró el log del correo electrónico',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró el log del correo electrónico',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('reprocess')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Protege la ruta con AuthGuard y RolesGuard
  @Roles('admin', 'moderator') // Solo usuarios con roles 'admin' o 'moderator' pueden acceder
  async reprocessEmail(
    @Body()
    body: {
      id: number;
      to?: string;
      replacements?: Record<string, any>;
    },
  ) {
    const { id, to, replacements: newReplacements } = body;
    const emailLog = await this.emailService.getEmailLogById(id);
    // Validamos que se haya proporcionado un ID
    // y que el log del correo electrónico exista
    console.log('Reprocesando email con ID:', id, 'Nuevo destinatario:', to);
    console.log('Email Log:', emailLog);
    if (!emailLog) {
      return {
        success: false,
        message: 'No se encontró el log del correo electrónico',
      };
    }
  if (emailLog.emailType !== 'critico' && emailLog.emailType !== 'critical') {
      return {
        success: false,
    message: 'Solo se pueden reprocesar correos de tipo "critical"',
      };
    }
    // Validamos que el ID del correo electrónico sea válido
    if (!id) {
      return {
        success: false,
        message: 'Falta el ID del correo a reprocesar',
      };
    }

    // Parse replacements para asegurarnos de que sea un objeto
    let replacements: Record<string, any> = {};
    try {
      replacements =
        newReplacements || JSON.parse(emailLog.replacements || '{}');
    } catch {
      console.error('Error parsing replacements:', emailLog.replacements);
      return {
        success: false,
        message: 'Error al procesar las replacements del log',
      };
    }

    if (!emailLog.key) {
      return {
        success: false,
        message:
          'No se encontró la plantilla asociada al log del correo electrónico',
      };
    }

    // Si se proporciona un nuevo destinatario, lo actualizamos
    const newTo = to || emailLog.to;
    // Enviamos el correo electrónico nuevamente usando el servicio de email
    await this.emailService.enqueueEmailJob(
      emailLog.key, // Usamos la plantilla original
      {
        to: newTo,
        replacements, // Aseguramos que las replacements sean un objeto
        sentById: emailLog.sentById ?? undefined, // Mantenemos el ID del usuario que envió originalmente
        ip: emailLog.ip ?? undefined, // Mantenemos la IP del usuario que envió originalmente
  emailType: emailLog.emailType ?? 'critico',
        userAgent: emailLog.userAgent ?? undefined, // Mantenemos el user agent del log original
      },
    );
    return {
      success: true,
      message: 'Correo reprocesado correctamente',
      to: newTo,
      logId: id,
      subject: emailLog.subject,
      key: emailLog.key,
      html: emailLog.html,
      text: emailLog.text,
      emailType: emailLog.emailType,
      replacements: replacements,
      status: 'pending', // Indicamos que el correo está en proceso de envío
    };
  }
  //Previsualizar las plantillas de correo
  @ApiOperation({
    summary: 'Previsualizar una plantilla de correo electrónico',
  })
  @ApiBody({ type: SendTemplateDto })
  @ApiResponse({
    status: 200,
    description: 'Plantilla de correo electrónico compilada correctamente',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @Post('preview-template')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Protege la ruta con AuthGuard y RolesGuard
  @Roles('admin', 'moderator') // Solo usuarios con roles 'admin' o 'moderator' pueden acceder
  async previewTemplate(@Body() body: SendTemplateDto) {
    const { key, replacements } = body;
    const template = await this.emailService.getCompiledTemplate(
      key,
      replacements,
    );
    return {
      Subject: template.subject,
      Html: template.html,
      Text: template.text,
    };
  }
  //test de prueba
  @Post('test-direct')
  async testDirectEmail() {
    await this.emailService.sendEmail(
      'info@sexchapero.com', // Cambia por tu email real de prueba
      'Test directo desde backend',
      'Este es un email enviado DIRECTAMENTE usando Nodemailer, sin cola.',
    );
    return { message: 'Intento de envío directo realizado' };
  }
}
