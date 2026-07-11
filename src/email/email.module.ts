import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConfigModule } from '@nestjs/config';
import { TemplateModule } from './template/template.module';
import { EmailController } from './email.controller';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [ConfigModule, TemplateModule, QueueModule], // Importa ConfigModule para acceder a las variables de entorno
  providers: [EmailService],
  exports: [EmailService],
  controllers: [EmailController], // Exporta EmailService para que pueda ser utilizado en otros módulos
})
export class EmailModule {}
