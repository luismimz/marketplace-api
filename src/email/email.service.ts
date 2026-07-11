import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TemplateService } from './template/template.service';
import { EmailType } from './dto/email.enums';
import { normalizeEmailType as utilNormalizeEmailType } from './email.utils';

// Datos que recibe un job de la cola de email (tipado unificado)
export interface EmailJobData {
  key: string;
  to: string;
  replacements: Record<string, string>;
  sentById?: number;
  ip?: string;
  userAgent?: string;
  emailType?: string; // legacy o nuevo enum textual
}

type SendTemplateOptions = Omit<EmailJobData, 'key'>;
//Inyectamos el TemplateSercice para poder consultar las plantillas de correo
// guardamos en la BBDD con su clave KEY
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly config: ConfigService,
    private readonly templateService: TemplateService,
    private readonly prisma: PrismaService, // Inyecta PrismaService si necesitas registrar logs de envío ,
    @InjectQueue('email') private readonly emailQueue: Queue, // Inyecta la cola de email para procesar envíos asíncronos
  ) {
    // transportador de nodemailer SMTP
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'), // Puedes cambiar esto según tu proveedor de correo
      port: this.config.get('SMTP_PORT') || 587, // Puerto por defecto para SMTP
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  // funcion para reemplazar variables en el texto y HTML de la plantilla {{var}}
  private replaceVariables(
    template: string,
    replacements: Record<string, string>,
  ): string {
    let result = template;
    // Recorremos cada clave del objeto de reemplazo
    for (const key in replacements) {
      //creamos una expresion regular para buscar {{clave}} con o sin espacios
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      // Reemplazamos la clave por su valor en el texto
      result = result.replace(placeholder, replacements[key]);
    }
    return result;
  }
  /***
   * Envio de email generico con texto plano o HTML
   * @param to Dirección de correo del destinatario
   * @param subject Asunto del correo
   * @param text Texto plano del correo
   * @param html Texto HTML del correo (opcional)
   * @returns Promise<void> que se resuelve cuando el correo se envía correctamente
   * @throws Error si ocurre un error al enviar el correo
   */
  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'), // Dirección de correo del remitente
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      console.error('Error al enviar el correo electrónico:', error);
      throw new Error('Error al enviar el correo electrónico');
    }
  }
  /**Envia un email a partir de una plantilla en la BBDD con {var} dinamicas */
  // Render y envío directo (sin cola). Mantiene compatibilidad con valores legacy de emailType.
  async sendTemplate(
    key: string,
    options: SendTemplateOptions,
  ): Promise<void> {
    // 1. Buscar plantilla
    const template = await this.templateService.findByKey(key);
    if (!template) throw new Error(`Template with key ${key} not found`);

    // 2. Prepara el contenido compilando variables
    const compiledSubject = this.replaceVariables(
      template.subject || '',
      options.replacements,
    );
    const compiledText = this.replaceVariables(
      template.text || '',
      options.replacements,
    );
    const compiledHtml = this.replaceVariables(
      template.html || '',
      options.replacements,
    );

    // 3. Decide tipo de contenido
    let text: string | undefined = undefined;
    let html: string | undefined = undefined;
    if (template.contentType === 'both') {
      text = compiledText;
      html = compiledHtml;
    } else if (template.contentType === 'text') {
      text = compiledText;
    } else if (template.contentType === 'html') {
      html = compiledHtml;
    }

    let status = 'ok';
    let errorMsg = '';
    const normalizedType = utilNormalizeEmailType(options.emailType);

    // Validación de variables declaradas vs usadas
    try {
      const declared: string[] = (template as any).variables || [];
      if (Array.isArray(declared) && declared.length > 0) {
        const providedKeys = Object.keys(options.replacements || {});
        const missing = declared.filter((k) => !providedKeys.includes(k));
        const extra = providedKeys.filter((k) => !declared.includes(k));
        if (missing.length) {
          this.logger.warn(`Template ${key} variables faltantes: ${missing.join(', ')}`);
        }
        if (extra.length) {
          this.logger.warn(`Template ${key} variables no declaradas recibidas: ${extra.join(', ')}`);
        }
      }
    } catch (e) {
      this.logger.debug(`No se pudo validar variables de la plantilla ${key}: ${(e as Error).message}`);
    }

    try {
      // Añadimos headers de desuscripción si es marketing
      const headers = normalizedType === EmailType.MARKETING ? this.buildUnsubscribeHeaders() : undefined;
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: options.to,
        subject: compiledSubject,
        text,
        html,
        headers,
      });
    } catch (error) {
      status = 'error';
      errorMsg =
        (error as Error).message || 'Error desconocido al enviar el correo';
      console.error(`Error al enviar el correo a ${options.to}:`, error);
    }
    // buscamos el usuario que envio el correo (si existe)
    let userId: number | null = null;
    const user = await this.prisma.user.findUnique({
      where: { email: options.to },
    });
    if (user) userId = user.id; // Guardamos el ID del usuario destinatario
  // Solo guarda log detallado si es CRITICAL (critico legacy)
  if (normalizedType === EmailType.CRITICAL) {
      await this.prisma.emailLog.create({
        data: {
          to: options.to,
          userId, // Guardamos el ID del usuario destinatario
          subject: compiledSubject,
          key,
          sentById: options.sentById,
          status,
          errorMsg,
          ip: options.ip,
          userAgent: options.userAgent,
          html,
          text,
      emailType: normalizedType,
          replacements: JSON.stringify(options.replacements),
          createdAt: new Date(),
        },
      });
    }
  // Si es critico y falló, lanza error para marcar job failed
    if (status === 'error') {
      throw new Error(errorMsg);
    }
  console.log(`Correo enviado a ${options.to} usando la plantilla ${key} (${normalizedType})`);
  }
  async sendMagicLink(email: string, token: string): Promise<void> {
    // URLs configurables
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const backendUrl = this.config.get('BACKEND_URL') || this.config.get('API_BASE_URL');
    // Enlace pensado para SPA (frontend) y enlace directo al endpoint backend para fallback
    const frontendLink = `${frontendUrl.replace(/\/$/, '')}/magic-login?token=${token}`;
    const backendLink = backendUrl
      ? `${backendUrl.replace(/\/$/, '')}/auth/magic-login?token=${token}`
      : undefined;

    const htmlLines = [
      '<p>Hola 👋</p>',
      '<p>Pulsa aquí para acceder sin contraseña:</p>',
      `<p><a href="${frontendLink}">Acceder ahora</a></p>`,
    ];
    if (backendLink) {
      htmlLines.push('<p>Si el enlace anterior no funciona usa este fallback:</p>');
      htmlLines.push(`<p><a href="${backendLink}">${backendLink}</a></p>`);
    }
    htmlLines.push('<p>Este enlace expirará en unos minutos.</p>');

    const html = htmlLines.join('\n');
    const text = `Accede sin contraseña:\n${frontendLink}${backendLink ? `\nFallback: ${backendLink}` : ''}`;

    const mailOptions = {
      from: this.config.get('MAIL_FROM'),
      to: email,
      subject: 'Tu enlace mágico de acceso',
      html,
      text,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Magic link enviado a ${email}`);
    } catch (e) {
      this.logger.error(`Error enviando magic link a ${email}: ${(e as Error).message}`);
      throw e;
    }
  }

  async getLogs(where: any = {}, limit: number = 30, offset: number = 0) {
    return this.prisma.emailLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc', // Ordenamos por fecha de creación descendente
      },
      take: limit, // Límite de registros
      skip: offset, // Desplazamiento para paginación
      include: {
        sentBy: {
          select: {
            id: true,
            email: true,
            username: true, // Incluimos el nombre de usuario si es necesario
            role: true, // Incluimos el rol del usuario
          },
        },
      },
    });
  }
  //metodo para obtener una plantilla compilada
  async getCompiledTemplate(key: string, replacements: Record<string, string>) {
    const template = await this.templateService.findByKey(key);
    if (!template) {
      throw new Error(`Template with key ${key} not found`);
    }
    // Reemplazamos las variables en el texto y el HTML de la plantilla
    const compiledSubject = this.replaceVariables(
      template.subject || '',
      replacements,
    );
    const compiledText = this.replaceVariables(
      template.text || '',
      replacements,
    );
    const compiledHtml = this.replaceVariables(
      template.html || '',
      replacements,
    );
    return {
      subject: compiledSubject,
      text: compiledText,
      html: compiledHtml,
    };
  }
  // Enviar un correo a través de la cola de Bull
  async enqueueEmailJob(
    key: string,
    options: SendTemplateOptions,
  ): Promise<string | number> {
  const normalizedType = utilNormalizeEmailType(options.emailType);
    const job = await this.emailQueue.add(
      'send',
      {
        key,
        ...options,
        emailType: normalizedType,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 60000 },
        removeOnComplete: 1000,
        removeOnFail: false,
        ...(normalizedType === EmailType.MARKETING
          ? { priority: 5 } // menor prioridad relativa si gestionas workers por prioridad
          : {}),
      },
    );
    console.log('[ENQUEUE EMAIL] Datos:', { key, options, jobId: job.id, normalizedType });
    return job.id;
  }
  async getEmailLogById(id: number) {
    return this.prisma.emailLog.findUnique({
      where: { id },
    });
  }
  /**
   * 1. Render Simple de {{placeholder}} en subject/text/html
   * 2. Envia un PIN de verificacion al correo del usuario
   * -Code: PIN numerico de 6 digitos
   * Caduca en 15 minutos en la BBDD esta la fecha de caducidad
   */
  private render(
    tpl: string | null | undefined,
    vars: Record<string, any>,
  ): string | undefined {
    if (!tpl) return undefined;
    // Reemplaza las variables en la plantilla con los datos proporcionados
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    // const from = process.env.MAIL_FROM || 'no-reply@sexchapero.com';
    const siteName = process.env.SITE_NAME || 'sexchapero.com';
    const from =
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      `no-reply@${siteName.replace(/^https?:\/\//, '')}`;
    // Asunto y cuerpo por defecto (luego lo moveremos a plantillas)
    // 1) Buscar plantilla (si no existe, usamos fallback)
    let subject = 'Tu código de verificación';
    let text =
      `Hola,\n\n` +
      `Hemos recibido una solicitud para verificar tu correo en ${siteName}.\n` +
      `Tu código de verificación es: ${code}\n\n` +
      `Si no has sido tú, ignora este mensaje.`;
    let html =
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">` +
      `<h2 style="margin:0 0 8px">Verifica tu correo</h2>` +
      `<p>Tu código de verificación es:</p>` +
      `<p style="font-size:24px;font-weight:700;letter-spacing:4px;margin:12px 0">${code}</p>` +
      `<p>Este código caduca en unos minutos. Si no solicitaste esta verificación, puedes ignorar este correo.</p>` +
      `<hr style="border:none;border-top:1px solid #eee;margin:16px 0" />` +
      `<p style="color:#666;font-size:12px">${siteName}</p>` +
      `</div>`;

    try {
      const tpl = await this.prisma.emailTemplate.findUnique({
        where: { key: 'verify-email-code' },
      });

      if (tpl) {
        const vars = { code, email, siteName };
        subject = this.render(tpl.subject, vars) || subject;
        const renderedText = this.render(tpl.text, vars);
        const renderedHtml = this.render(tpl.html, vars);
        // Si la plantilla define html, lo usamos; si no, usamos text; si ninguno, fallback
        if (renderedHtml) html = renderedHtml;
        if (renderedText) text = renderedText;
      }
    } catch (e) {
      // Si falla la búsqueda de plantilla, seguimos con fallback
      this.logger.warn(
        `No se pudo leer la plantilla 'verify-email-code': ${e?.message || e}`,
      );
    }

    // 2) Enviar correo
    let status: 'SENT' | 'FAILED' = 'FAILED';
    let errorMessage: string | undefined;

    try {
      await this.transporter.sendMail({ from, to: email, subject, text, html });
      status = 'SENT';
      this.logger.log(`PIN enviado a ${email}`);
    } catch (err: any) {
      errorMessage = err?.message || String(err);
      this.logger.error(`Error enviando PIN a ${email}: ${errorMessage}`);
    }

    // 3) Guardar log (evitamos romper por tipos usando any)
    try {
      const data: any = {
        to: email,
        subject,
        // Guardar un resumen corto para no saturar BD (ajústalo según tu modelo)
        text: text?.slice(0, 5000),
        html: html?.slice(0, 10000),
        status, // 'SENT' | 'FAILED'
        key: 'verify-email-code',
        // Si tu modelo usa userId/nombre de relación, se puede añadir aquí
        // userId: ...
        errorMsg: errorMessage ?? null,
      };
      await (this.prisma as any).emailLog?.create?.({ data });
    } catch (e) {
      // No rompemos si el modelo difiere; lo afinamos en el siguiente paso si quieres
      this.logger.warn(
        `EmailLog no guardado (ajustar modelo): ${e?.message || e}`,
      );
    }
  }

  /**
   * Normaliza valores legacy de emailType a los enums actuales.
  * Normalización de tipos: critico->critical, newsletter->marketing, alerta->info
   */
  // normalización duplicada eliminada: se usa utilNormalizeEmailType desde email.utils

  /**
   * Headers List-Unsubscribe para correos de marketing (aún no aplicados en sendTemplate: TODO cuando plantilla/emailType = marketing).
   * TODO: token único real y dominio multi-plataforma.
   */
  buildUnsubscribeHeaders(): Record<string, string> {
    const domain = (this.config.get('PUBLIC_DOMAIN') || 'example.com').replace(/^https?:\/\//, '');
    const token = 'UNSUB_TOKEN_TODO';
    return {
      'List-Unsubscribe': `<mailto:unsubscribe@${domain}>, <https://${domain}/u/${token}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }
}
