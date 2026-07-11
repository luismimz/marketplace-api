import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import {
  EmailContentType as PrismaEmailContentType,
  EmailType as PrismaEmailType,
} from '@prisma/client';
import { EmailContentType, EmailType } from '../dto/email.enums';

// Mapeos entre los nuevos enums (DTO) y los enums legacy en la base de datos (Prisma)
// Mapeo nuevo->legacy (DB sigue usando enum legacy)
const mapEmailTypeForDb = (t: EmailType): PrismaEmailType => {
  switch (t) {
    case EmailType.CRITICAL:
      return PrismaEmailType.critico;
    case EmailType.TRANSACTIONAL:
      return PrismaEmailType.alerta; // se usa alerta como transactional
    case EmailType.INFO:
      return PrismaEmailType.info;
    case EmailType.MARKETING:
      return PrismaEmailType.newsletter;
    default:
      return PrismaEmailType.info;
  }
};

// Prisma EmailContentType enum: text | html | both (coinciden los string values)
const mapContentTypeForDb = (
  c: EmailContentType,
): PrismaEmailContentType => {
  switch (c) {
    case EmailContentType.TEXT:
      return PrismaEmailContentType.text;
    case EmailContentType.HTML:
      return PrismaEmailContentType.html;
    case EmailContentType.BOTH:
      return PrismaEmailContentType.both;
  }
};

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTemplateDto) {
    const { replacements, emailType, contentType, ...rest } = dto;
    return this.prisma.emailTemplate.create({
      data: {
        ...rest,
        emailType: mapEmailTypeForDb(emailType),
        contentType: mapContentTypeForDb(contentType),
        variables: replacements ?? [],
      },
    });
  }

  async findAll(contentType?: string) {
    const where = contentType
      ? { contentType: contentType as EmailContentType }
      : {};
  return this.prisma.emailTemplate.findMany({ where });
  }

  async findOne(id: string) {
  return this.prisma.emailTemplate.findUnique({ where: { id } });
  }
  async findByKey(key: string) {
  return this.prisma.emailTemplate.findUnique({ where: { key } });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    const { replacements, emailType, contentType, ...rest } = dto;
  return this.prisma.emailTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...(emailType
          ? { emailType: mapEmailTypeForDb(emailType) }
          : {}),
        ...(contentType
          ? { contentType: mapContentTypeForDb(contentType) }
          : {}),
        ...(replacements ? { variables: replacements } : {}),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.emailTemplate.delete({
      where: { id },
    });
  }
}
