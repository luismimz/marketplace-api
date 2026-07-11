import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('../prisma/prisma.service');

// Test aislado de lógica de magic link sin levantar Nest completo

describe('AuthService Magic Link', () => {
  let service: AuthService;
  const email = 'user@example.com';
  const user = { id: 1, email, emailVerified: true } as any;

  let prismaMock: any;

  const emailServiceMock: any = {
    sendMagicLink: jest.fn(async () => undefined),
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    prismaMock = new (PrismaService as any)();
    prismaMock.user.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.email === email) return user;
      if (where.id === user.id) return user;
      return null;
    });
    prismaMock.user.update.mockResolvedValue(user);
    service = new AuthService(prismaMock, jwt as any, emailServiceMock);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('envía magic link y llama EmailService', async () => {
    const res = await service.sendMagicLink(email);
    expect(res.message).toBeDefined();
    expect(emailServiceMock.sendMagicLink).toHaveBeenCalledTimes(1);
    const [calledEmail, token] = emailServiceMock.sendMagicLink.mock.calls[0];
    expect(calledEmail).toBe(email);
    expect(typeof token).toBe('string');
  });

  it('lanza Unauthorized si el usuario no existe', async () => {
    await expect(service.sendMagicLink('no@found.com')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('permite login con token válido', async () => {
    await service.sendMagicLink(email);
    const token = emailServiceMock.sendMagicLink.mock.calls[0][1];
  const result = await service.loginWithMagicLink(token);
  expect(result.access).toBeDefined();
  });

  it('rechaza login con token inválido', async () => {
    await expect(service.loginWithMagicLink('token.invalido')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
