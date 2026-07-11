import { EmailType } from './dto/email.enums';

export function normalizeEmailType(type?: string): EmailType {
  if (!type) return EmailType.TRANSACTIONAL;
  const lower = type.toLowerCase();
  switch (lower) {
    case 'critico':
    case 'critical':
      return EmailType.CRITICAL;
    case 'newsletter':
    case 'marketing':
      return EmailType.MARKETING;
    case 'alerta':
    case 'info':
      return EmailType.INFO;
    case 'transactional':
      return EmailType.TRANSACTIONAL;
    default:
      return EmailType.TRANSACTIONAL;
  }
}

export function buildUnsubscribeHeaders(domain = 'example.com') {
  const token = 'UNSUB_TOKEN_TODO';
  const clean = domain.replace(/^https?:\/\//, '');
  return {
    'List-Unsubscribe': `<mailto:unsubscribe@${clean}>, <https://${clean}/u/${token}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// Mantiene soporte bidireccional legacy/new para transición.
