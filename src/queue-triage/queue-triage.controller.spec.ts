import { Test, TestingModule } from '@nestjs/testing';
import { FinalizedTriageDto } from './dto/finalized-triage.dto';
import { TriageListDto } from './dto/triage-list.dto';
import { QueueTriageController } from './queue-triage.controller';
import { QueueTriageService } from './queue-triage.service';

const mockList: TriageListDto[] = [
  { queueId: 1, name: 'João', gender: 'M', age: 30, queueTicket: 'A001', classificacao: 'Laranja', prioridade: 'Muito urgente' },
];

const mockDetail: FinalizedTriageDto = {
  queueId: 1,
  name: 'João Silva',
  gender: 'M',
  age: 30,
  queueTicket: 'A001',
  symptoms: 'Febre alta',
  classificacao: 'Laranja',
  prioridade: 'Muito urgente',
  tempo_atendimento: '10 minutos',
  fluxograma_utilizado: 'Adulto com febre',
  discriminadores_ativados: ['Febre alta'],
  justificativa: 'Febre acima de 39°C',
  createdAtDate: '15/01/2024',
  createdAtTime: '10:30:00',
};

describe('QueueTriageController', () => {
  let controller: QueueTriageController;
  let service: jest.Mocked<QueueTriageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueTriageController],
      providers: [
        {
          provide: QueueTriageService,
          useValue: {
            getFinalizedTriages: jest.fn(),
            getQueueTriageById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(QueueTriageController);
    service = module.get(QueueTriageService);
  });

  describe('getFinalizedTriages', () => {
    it('should return list of finalized triages', async () => {
      service.getFinalizedTriages.mockResolvedValue(mockList);

      const result = await controller.getFinalizedTriages();

      expect(result).toBe(mockList);
      expect(service.getFinalizedTriages).toHaveBeenCalled();
    });

    it('should return empty array when no triages', async () => {
      service.getFinalizedTriages.mockResolvedValue([]);

      const result = await controller.getFinalizedTriages();

      expect(result).toEqual([]);
    });
  });

  describe('getDetails', () => {
    it('should return triage details by id', async () => {
      service.getQueueTriageById.mockResolvedValue(mockDetail);

      const result = await controller.getDetails(1);

      expect(result).toBe(mockDetail);
      expect(service.getQueueTriageById).toHaveBeenCalledWith(1);
    });
  });
});
