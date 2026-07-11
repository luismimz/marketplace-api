import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { identifier: string; password: string }) {
    const user = await this.authService.validateUser(
      body.identifier,
      body.password,
    );
    // si todo es correcto, se procede a iniciar sesión
    if (!user) {
      throw new Error('Invalid credentials');
    }
    // Retorna el token de acceso
    // Aquí se asume que el método login del AuthService retorna un token JWT
    // o similar, que es lo que se espera en una autenticación típica.
    // Si el método login no está definido, deberías implementarlo en AuthService.
    // Por ejemplo:
    // return this.authService.login(user);
    // Asegúrate de que el método login en AuthService maneje correctamente la creación
    // y retorno del token.
    // Aquí se asume que el método login retorna un token JWT o similar.
    // Si el método login no está definido, deberías implementarlo en AuthService.
    return this.authService.login(user);
  }
}
