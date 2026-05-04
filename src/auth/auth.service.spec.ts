import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

const mockQueueTriage = {
  id: 1,
  queueTicket: 'A001',
  patient: { id: 1, name: 'João Silva', cpf: '12345678901', age: 30, gender: 'M' },
  status: { id: 0, statusName: 'Em Aberto' },
  triage: null,
  createdAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<Repository<QueueTriage>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(QueueTriage),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get(getRepositoryToken(QueueTriage));
  });

  describe('authenticate', () => {
    it('should return authenticated=true when credentials match', async () => {
      repo.findOne.mockResolvedValue(mockQueueTriage as any);

      const result = await service.authenticate('12345678901', 'A001');

      expect(result).toEqual(new AuthResponseDto(true, 'João Silva', 1, 0));
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { queueTicket: 'A001', patient: { cpf: '12345678901' } },
        relations: ['patient', 'status'],
      });
    });

    it('should return authenticated=false when no queue triage found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.authenticate('00000000000', 'Z999');

      expect(result).toEqual(new AuthResponseDto(false));
      expect(result.patientName).toBeNull();
      expect(result.queueTriageId).toBeNull();
      expect(result.statusId).toBeNull();
    });

    it('should pass correct relations to findOne', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.authenticate('12345678901', 'A001');

      expect(repo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations: ['patient', 'status'] }),
      );
    });
  });
});
