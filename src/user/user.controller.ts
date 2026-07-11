import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth'; // Importar el guardia JWT
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { AuthGuard } from '@nestjs/passport'; // Importar AuthGuard para proteger las rutas
import { PrismaService } from 'src/prisma/prisma.service'; // Importar PrismaService si es necesario para operaciones de base de datos
import { User } from './entities/user.entity';
import { Roles } from 'src/common/decorators/roles.decorator'; // Importar el decorador de roles
import { RolesGuard } from 'src/common/guards/roles.guard';

@UseGuards(AuthGuard('jwt')) // Aplicar el guardia JWT a este controlador
// Esto asegura que todas las rutas de este controlador requieren autenticación JWT
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
  //GET para obtener el perfil del usuario autenticado
  @UseGuards(JwtAuthGuard) // Aplicar el guardia JWT a este endpoint
  @Get('me')
  async getProfile(@GetUser() user: any) {
    console.log('Usuario recibido del JWT:', user);
    // Aquí puedes usar el usuario autenticado para obtener más información
    return { message: 'Peril del usuario autenticado', user };
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(Number(id));
  }

  @Get(':id/emails')
  @UseGuards(AuthGuard('jwt'), RolesGuard) // Protege esta ruta con el guardia JWT
  @Roles('admin', 'moderator') // Define roles que pueden acceder a esta ruta
  async getUserEmails(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(id) },
    });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    //Busca todos los logsd criticis enviados a este usuario
    const emails = await this.prisma.emailLog.findMany({
      where: {
        userId: Number(id), // Filtra por el ID del usuario
        emailType: 'critico', // Filtra por tipo de correo
      },
      orderBy: {
        createdAt: 'desc', // Ordena por fecha de creación descendente
      },
      select: {
        id: true,
        to: true,
        subject: true,
        status: true,
        errorMsg: true,
        createdAt: true,
      },
    });
    return emails;
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
