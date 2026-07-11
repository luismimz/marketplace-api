import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const normalizedEmail = createUserDto.email.toLowerCase();
    const normalizeUsername = createUserDto.username.toLowerCase();
    createUserDto.email = normalizedEmail; // Normalizar el email
    createUserDto.username = normalizeUsername; // Normalizar el username
    // Log para depuración
    console.log('Creando usuario con los siguientes datos normalizados:');
    console.log('Email normalizado:', normalizedEmail);
    console.log('Username normalizado:', normalizeUsername);
    // Log para depuración del DTO recibido
    console.log('DTO recibido:', createUserDto);
    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: normalizeUsername }],
      },
    });
    if (existingUser) {
      throw new ConflictException(
        'El usuario ya existe con ese email o username',
      );
    }
    // Hashear la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    console.log('Contraseña hasheada:', hashedPassword);
    createUserDto.password = hashedPassword; // Asignar la contraseña hasheada al DTO
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword, // Asegurarse de que la contraseña hasheada se guarde
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany();
  }
  //esta parte es un ejemplo de cómo se podría implementar un método para encontrar un usuario por ID
  findOne(id: number) {
    const userId = Number(id);
    if (isNaN(userId)) {
      throw new Error('El id proporcionado no es un número válido');
    }
    console.log('findOne llamado con id:', userId);
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        // Puedes agregar más campos según sea necesario
      },
    });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
