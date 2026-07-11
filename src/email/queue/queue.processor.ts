import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { EmailService, EmailJobData } from '../email.service';

@Processor('email')
export class EmailQueueProcessor {
  constructor(private readonly emailService: EmailService) {
    console.log('🚀 EmailQueueProcessor INICIALIZADO');
  }

  @Process('send')
  async handleEmailJob(job: Job<EmailJobData>) {
    console.log('➡️ Procesando trabajo de la cola:', job.data);
    //Aqui procesa el job recibido de la cola (enviando el correo)
    const { key, to, replacements, sentById, ip, userAgent, emailType } =
      job.data;
    try {
      console.log('📩 ENTRANDO en handleEmailJob, DATA:', job.data);
      await this.emailService.sendTemplate(key, {
        to,
        replacements,
        sentById,
        ip,
        userAgent,
        emailType,
      });
      console.log(`✅ Correo enviado a ${to} usando la plantilla ${key}`);
      return true; // Retorna true si el envío fue exitoso
    } catch (err) {
      //Puedes loguar o gestionar el error como desees
      console.error(`❌ Error al enviar el correo a ${to}:`, err);
      throw err;
    }
  }
}
// Este procesador se encarga de manejar los trabajos de la cola de correos electrónicos.
// Se ejecuta cada vez que se añade un trabajo a la cola 'email'.
// Utiliza el EmailService para enviar el correo electrónico utilizando la plantilla especificada.
// Si el envío es exitoso, retorna true. Si hay un error, lo captura y lo loguea, lanzando el error para que Bull pueda manejarlo adecuadamente.
// Asegúrate de que el EmailService esté correctamente configurado para enviar correos electrónicos
// y que las plantillas estén disponibles en la base de datos o en el sistema de archivos
