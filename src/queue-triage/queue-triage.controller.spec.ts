import { Test, TestingModule } from '@nestjs/testing';
import { FinalizedTriageDto } from './dto/finalized-triage.dto';
import { PatientTriageResponseDto } from './dto/patient-triage-response.dto';
import { TriageListDto } from './dto/triage-list.dto';
import { QueueTriageController } from './queue-triage.controller';
import { PatientTriageService } from './patient-triage.service';
import { QueueTriageService } from './queue-triage.service';

const mockList: TriageListDto[] = [
  {
    queueId: 1,
    name: 'João',
    gender: 'M',
    age: 30,
    queueTicket: 'A001',
    classificacao: 'ESI-2',
    prioridade: '2',
  },
];

const mockDetail: FinalizedTriageDto = {
  queueId: 1,
  name: 'João Silva',
  gender: 'M',
  age: 30,
  queueTicket: 'A001',
  symptoms: 'Febre alta',
  classificacao: 'ESI-2',
  nivel: 2,
  nome_nivel: 'Emergente',
  ponto_decisao_ativado: 'B',
  criterios_ponto_decisao: ['Febre alta'],
  recursos_estimados: 3,
  justificativa: 'Febre acima de 39°C',
  createdAtDate: '15/01/2024',
  createdAtTime: '10:30:00',
};

const mockPatientTriage: PatientTriageResponseDto = {
  id: 10,
  symptoms: 'Dor no peito',
  queueTicket: 'FD-ABC123',
  symptomsPreview: 'Dor no peito',
  createdAt: '2026-05-29T12:00:00.000Z',
  updatedAt: '2026-05-29T12:00:00.000Z',
  status: 'PENDING' as any,
  patientStatus: 'PENDENTE',
  riskClassification: null,
  displayColor: 'yellow',
};

describe('QueueTriageController', () => {
  let controller: QueueTriageController;
  let service: jest.Mocked<QueueTriageService>;
  let patientTriageService: jest.Mocked<PatientTriageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueTriageController],
      providers: [
        {
          provide: QueueTriageService,
          useValue: {
            getFinalizedTriages: jest.fn(),
            getQueueTriageById: jest.fn(),
            updateQueueTriage: jest.fn(),
            removeQueueTriage: jest.fn(),
          },
        },
        {
          provide: PatientTriageService,
          useValue: {
            listPatientTriages: jest.fn(),
            createPatientTriage: jest.fn(),
            getPendingProfessionalReview: jest.fn(),
            confirmProfessionalReview: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(QueueTriageController);
    service = module.get(QueueTriageService);
    patientTriageService = module.get(PatientTriageService);
  });

  describe('patient triages', () => {
    it('should list triages for the authenticated patient CPF', async () => {
      patientTriageService.listPatientTriages.mockResolvedValue([
        mockPatientTriage,
      ]);

      const query = { cpf: '12345678901' };
      const result = await controller.getPatientTriages(query);

      expect(result).toEqual([mockPatientTriage]);
      expect(patientTriageService.listPatientTriages).toHaveBeenCalledWith(
        query,
      );
    });

    it('should create a patient triage', async () => {
      patientTriageService.createPatientTriage.mockResolvedValue(
        mockPatientTriage,
      );

      const dto = {
        cpf: '12345678901',
        symptoms: 'Dor no peito',
      };
      const result = await controller.createPatientTriage(dto);

      expect(result).toBe(mockPatientTriage);
      expect(patientTriageService.createPatientTriage).toHaveBeenCalledWith(
        dto,
      );
    });

    it('should list triages pending professional review', async () => {
      const pendingReview = {
        id: 10,
        patientId: 1,
        patientName: 'Joao',
        patientAge: 30,
        patientGender: 'M',
        symptoms: 'Dor no peito',
        aiSummary: 'Resumo',
        aiSuggestedRiskClassification: 'ESI-2',
        aiSuggestedRiskColor: '#fe0000',
        aiRecommendedAction: 'Avaliar',
        aiResult: {},
        createdAt: '2026-05-29T12:00:00.000Z',
        aiProcessedAt: '2026-05-29T12:01:00.000Z',
        queueTriageId: 1,
        queueTicket: 'FD-ABC123',
      };
      patientTriageService.getPendingProfessionalReview.mockResolvedValue([
        pendingReview,
      ]);

      const result = await controller.getPendingReview();

      expect(result).toEqual([pendingReview]);
    });

    it('should confirm professional review', async () => {
      patientTriageService.confirmProfessionalReview.mockResolvedValue({
        ...mockPatientTriage,
        status: 'COMPLETED' as any,
        patientStatus: 'ANALISADA',
        riskClassification: 'ESI-2',
        displayColor: '#fe0000',
      });

      const dto = {
        finalRiskClassification: 'ESI-2',
        finalRiskColor: '#fe0000',
      };
      const result = await controller.professionalReview(10, dto);

      expect(result.patientStatus).toBe('ANALISADA');
      expect(
        patientTriageService.confirmProfessionalReview,
      ).toHaveBeenCalledWith(10, dto);
    });
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

  describe('update', () => {
    it('should update triage details by id', async () => {
      const dto = {
        symptoms: 'Febre e dor',
        classificacao: 'ESI-3',
        justificativa: 'Quadro estavel',
      };
      service.updateQueueTriage.mockResolvedValue(mockDetail);

      const result = await controller.update(1, dto);

      expect(result).toBe(mockDetail);
      expect(service.updateQueueTriage).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should remove triage by id', async () => {
      service.removeQueueTriage.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.removeQueueTriage).toHaveBeenCalledWith(1);
    });
  });
});
