import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { authenticate: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  describe('authenticate', () => {
    it('should return authenticated response when credentials are valid', async () => {
      const expected = new AuthResponseDto(true, 'João Silva', 1, 2);
      service.authenticate.mockResolvedValue(expected);

      const result = await controller.authenticate('12345678901', 'A001');

      expect(result).toBe(expected);
      expect(service.authenticate).toHaveBeenCalledWith('12345678901', 'A001');
    });

    it('should return unauthenticated response when credentials are invalid', async () => {
      const expected = new AuthResponseDto(false);
      service.authenticate.mockResolvedValue(expected);

      const result = await controller.authenticate('00000000000', 'Z999');

      expect(result).toBe(expected);
      expect(result.authenticated).toBe(false);
    });
  });
});
