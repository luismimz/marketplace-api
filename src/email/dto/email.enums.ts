/**
 * Enums de email centralizados para usarlos en DTOs, servicios y Swagger.
 * Ventaja: evitamos strings sueltos y mantenemos validaciones consistentes.
 */
export enum EmailContentType {
  TEXT = 'text',
  HTML = 'html',
  BOTH = 'both',
}

export enum EmailType {
  CRITICAL = 'critical',
  TRANSACTIONAL = 'transactional',
  INFO = 'info',
  MARKETING = 'marketing',
}

// TODO: Si existieran definiciones duplicadas en otros archivos, unificarlas importando desde aquí.
