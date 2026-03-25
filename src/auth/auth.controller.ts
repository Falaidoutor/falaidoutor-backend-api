import { Controller, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('login')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async authenticate(
    @Query('cpf') cpf: string,
    @Query('queueTicket') queueTicket: string,
  ): Promise<AuthResponseDto> {
    return this.authService.authenticate(cpf, queueTicket);
  }
}
