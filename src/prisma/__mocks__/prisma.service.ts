export class PrismaService {
  user = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  emailTemplate = { findUnique: jest.fn() };
  emailLog = { create: jest.fn() };
}
