import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../shared/entities/patient.entity';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

const mockPatient = {
  id: 1,
  name: 'Joao Silva',
  cpf: '12345678901',
  age: 30,
  gender: 'M',
};

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<Repository<Patient>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Patient),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get(getRepositoryToken(Patient));
  });

  describe('authenticate', () => {
    it('should return authenticated=true when CPF matches', async () => {
      repo.findOne.mockResolvedValue(mockPatient as any);

      const result = await service.authenticate('123.456.789-01');

      expect(result).toEqual(new AuthResponseDto(true, 'Joao Silva', 1, '12345678901'));
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { cpf: '12345678901' },
      });
    });

    it('should return authenticated=false when no patient found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.authenticate('00000000000');

      expect(result).toEqual(new AuthResponseDto(false));
      expect(result.patientName).toBeNull();
      expect(result.patientId).toBeNull();
      expect(result.cpf).toBeNull();
    });

    it('should query only by normalized CPF', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.authenticate('123.456.789-01');

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { cpf: '12345678901' } }),
      );
    });
  });
});
