import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BusinessException } from '../shared/exceptions/business.exception';
import { Triage } from '../shared/entities/triage.entity';
import { QueueTriageService } from '../queue-triage/queue-triage.service';
import { TriageService } from './triage.service';
import { TriageRequestDto } from './dto/triage-request.dto';

const mockTriageEntity: Triage = {
  id: 1,
  symptoms: 'Febre alta e dor de cabeça',
  risk: 'ESI-2',
  justification: 'Sintomas sugestivos de condição grave',
};

const mockApiResponse = {
  classificacao: 'ESI-2',
  nivel: 2,
  nome_nivel: 'Emergente',
  ponto_decisao_ativado: 'B',
  criterios_ponto_decisao: ['Febre alta', 'Dor de cabeça intensa'],
  recursos_estimados: 3,
  justificativa: 'Sintomas sugestivos de condição grave',
};

const validDto: TriageRequestDto = {
  queueId: '1',
  queueTicket: 'A001',
  symptoms: 'Febre alta e dor de cabeça',
};

describe('TriageService', () => {
  let service: TriageService;
  let triageRepo: jest.Mocked<Repository<Triage>>;
  let queueTriageService: jest.Mocked<QueueTriageService>;

  beforeEach(async () => {
    jest.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriageService,
        {
          provide: getRepositoryToken(Triage),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: QueueTriageService,
          useValue: {
            getValidQueueTriage: jest.fn(),
            linkTriageAndUpdateStatus: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                TRIAGE_SERVICE_URL: 'http://localhost:8000',
                APPLICATION_KEY: 'test-application-key',
              };
              return config[key];
            }),
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                TRIAGE_SERVICE_URL: 'http://localhost:8000',
                APPLICATION_KEY: 'test-application-key',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(TriageService);
    triageRepo = module.get(getRepositoryToken(Triage));
    queueTriageService = module.get(QueueTriageService);
  });

  describe('createTriageMock', () => {
    it('should throw BusinessException when symptoms is empty', async () => {
      await expect(service.createTriageMock('')).rejects.toThrow(BusinessException);
      await expect(service.createTriageMock('')).rejects.toThrow(
        'Lista de sintomas não pode ser vazia.',
      );
    });

    it('should throw BusinessException when symptoms is whitespace only', async () => {
      await expect(service.createTriageMock('   ')).rejects.toThrow(BusinessException);
    });

    it('should call triage API and return response DTO', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);
      triageRepo.create.mockReturnValue(mockTriageEntity);

      const result = await service.createTriageMock(validDto.symptoms);

      expect(result.classificacao).toBe('ESI-2');
      expect(result.nivel).toBe(2);
      expect(result.nome_nivel).toBe('Emergente');
      expect(result.ponto_decisao_ativado).toBe('B');
      expect(result.criterios_ponto_decisao).toEqual(['Febre alta', 'Dor de cabeça intensa']);
      expect(result.recursos_estimados).toBe(3);
      expect(result.justificativa).toBe('Sintomas sugestivos de condição grave');
    });
  });

  describe('createTriage', () => {
    it('should throw BusinessException when symptoms is empty', async () => {
      const dto: TriageRequestDto = { ...validDto, symptoms: '' };

      await expect(service.createTriage(dto)).rejects.toThrow(BusinessException);
    });

    it('should throw BusinessException when queueId is not a number', async () => {
      const dto: TriageRequestDto = { ...validDto, queueId: 'xyz' };

      await expect(service.createTriage(dto)).rejects.toThrow(BusinessException);
      await expect(service.createTriage(dto)).rejects.toThrow('ID da fila inválido.');
    });

    it('should call triage service and process response', async () => {
      queueTriageService.getValidQueueTriage.mockResolvedValue({} as any);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);
      triageRepo.create.mockReturnValue(mockTriageEntity);
      triageRepo.save.mockResolvedValue(mockTriageEntity);
      queueTriageService.linkTriageAndUpdateStatus.mockResolvedValue();

      const result = await service.createTriage(validDto);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/triage',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-application-key': 'test-application-key',
          },
          body: JSON.stringify({ symptoms: validDto.symptoms }),
        }),
      );
      expect(triageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          risk: 'ESI-2',
          justification: 'Sintomas sugestivos de condição grave',
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          symptoms: validDto.symptoms,
          classificacao: 'ESI-2',
          justificativa: 'Sintomas sugestivos de condição grave',
        }),
      );
    });

    it('should throw BusinessException when triage service returns error', async () => {
      queueTriageService.getValidQueueTriage.mockResolvedValue({} as any);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(service.createTriage(validDto)).rejects.toThrow(BusinessException);
      await expect(service.createTriage(validDto)).rejects.toThrow(
        'Erro ao chamar serviço de triagem',
      );
    });
  });
});
