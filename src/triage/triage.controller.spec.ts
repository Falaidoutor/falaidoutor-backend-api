import { Test, TestingModule } from '@nestjs/testing';
import { Triage } from '../shared/entities/triage.entity';
import { TriageRequestDto } from './dto/triage-request.dto';
import { TriageResponseDto } from './dto/triage-response.dto';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';

const mockTriage: Triage = {
  id: 1,
  symptoms: 'Febre alta e dor de cabeça',
  risk: 'ESI-2',
  justification: 'Sintomas sugestivos de condição grave',
};

const validDto: TriageRequestDto = {
  queueId: '1',
  queueTicket: 'A001',
  symptoms: 'Febre alta e dor de cabeça',
};

describe('TriageController', () => {
  let controller: TriageController;
  let service: jest.Mocked<TriageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriageController],
      providers: [
        {
          provide: TriageService,
          useValue: {
            createTriage: jest.fn(),
            createTriageMock: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(TriageController);
    service = module.get(TriageService);
  });

  describe('triageChat', () => {
    it('should call createTriage and return result', async () => {
      service.createTriage.mockResolvedValue(mockTriage);

      const result = await controller.triageChat(validDto);

      expect(result).toBe(mockTriage);
      expect(service.createTriage).toHaveBeenCalledWith(validDto);
    });
  });

  describe('triageChatMock', () => {
    it('should call createTriageMock and return result', async () => {
      const mockResult: TriageResponseDto = {
        symptoms: 'Febre alta e dor de cabeça',
        classificacao: 'ESI-2',
        nivel: 2,
        nome_nivel: 'Emergente',
        ponto_decisao_ativado: 'B',
        criterios_ponto_decisao: ['Febre alta', 'Dor de cabeça intensa'],
        recursos_estimados: 3,
        justificativa: 'Sintomas sugestivos de condição grave',
      };
      service.createTriageMock.mockResolvedValue(mockResult);

      const result = await controller.triageChatMock(validDto);

      expect(result).toBe(mockResult);
      expect(service.createTriageMock).toHaveBeenCalledWith(validDto.symptoms);
    });
  });
});
