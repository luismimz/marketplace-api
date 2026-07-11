import { normalizeEmailType, buildUnsubscribeHeaders } from '../email.utils';

describe('email.utils (unit)', () => {
  test('normalizeEmailType legacy mapping', () => {
  expect(normalizeEmailType('critico')).toBe('critical');
  expect(normalizeEmailType('newsletter')).toBe('marketing');
  expect(normalizeEmailType('alerta')).toBe('info');
    expect(normalizeEmailType('random')).toBe('transactional');
    expect(normalizeEmailType()).toBe('transactional');
  });

  test('buildUnsubscribeHeaders shape', () => {
    const h = buildUnsubscribeHeaders('mydomain.com');
    expect(h['List-Unsubscribe']).toContain('mailto:unsubscribe@mydomain.com');
    expect(h['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });
});
