import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailQueueProcessor } from './queue.processor';
import { EmailService } from '../email.service';
import { ConfigService } from '@nestjs/config';
import { TemplateModule } from '../template/template.module';

@Module({
  imports: [
    TemplateModule,
    //ConfigModule, // Importa ConfigModule para acceder a las variables de entorno
    BullModule.registerQueueAsync({
      name: 'email', // Clave configurable - Nombre de la cola
      useFactory: async (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'), // Host de Redis
          port: parseInt(config.get('REDIS_PORT') ?? '6379', 10), // Puerto de Redis
        },
      }),
      inject: [ConfigService], // Inyecta ConfigService para acceder a las variables de entorno
    }),
  ],
  providers: [EmailQueueProcessor, EmailService], // Proveedor del procesador de la cola y del servicio de email
  exports: [BullModule],
})
export class QueueModule {}
