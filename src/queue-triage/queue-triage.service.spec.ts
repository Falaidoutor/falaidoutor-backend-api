import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../shared/exceptions/business.exception';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { QueueTriageService } from './queue-triage.service';
import { TriageListDto } from './dto/triage-list.dto';

const mockPatient = { id: 1, name: 'João Silva', cpf: '12345678901', age: 30, gender: 'M' };
const mockTriage = {
  id: 1,
  symptoms: 'Febre alta',
  risk: 'Laranja',
  priority: 'Muito urgente',
  serviceTime: '10 minutos',
  flowchart: 'Adulto com febre',
  activatedDiscriminators: ['Febre alta'],
  justification: 'Febre acima de 39°C',
};
const mockStatus = { id: 2, statusName: 'Aguardando' };

const mockQueueTriage = {
  id: 1,
  queueTicket: 'A001',
  patient: mockPatient,
  triage: null,
  status: mockStatus,
  createdAt: new Date('2024-01-15T10:30:00'),
};

describe('QueueTriageService', () => {
  let service: QueueTriageService;
  let repo: jest.Mocked<Repository<QueueTriage>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueTriageService,
        {
          provide: getRepositoryToken(QueueTriage),
          useValue: {
            findOne: jest.fn(),
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(QueueTriageService);
    repo = module.get(getRepositoryToken(QueueTriage));
  });

  describe('getValidQueueTriage', () => {
    it('should return queue triage when valid and pending', async () => {
      repo.findOne.mockResolvedValue(mockQueueTriage as any);

      const result = await service.getValidQueueTriage(1, 'A001');

      expect(result).toBe(mockQueueTriage);
    });

    it('should throw BusinessException when queue triage not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getValidQueueTriage(99, 'Z999')).rejects.toThrow(BusinessException);
      await expect(service.getValidQueueTriage(99, 'Z999')).rejects.toThrow('Ficha inválida.');
    });

    it('should throw BusinessException when status is not 2 (already processed)', async () => {
      const finalized = { ...mockQueueTriage, status: { id: 1, statusName: 'Finalizado' } };
      repo.findOne.mockResolvedValue(finalized as any);

      await expect(service.getValidQueueTriage(1, 'A001')).rejects.toThrow(BusinessException);
      await expect(service.getValidQueueTriage(1, 'A001')).rejects.toThrow(
        'Ficha inválida ou já processada.',
      );
    });

    it('should query with correct relations', async () => {
      repo.findOne.mockResolvedValue(mockQueueTriage as any);

      await service.getValidQueueTriage(1, 'A001');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1, queueTicket: 'A001' },
        relations: ['patient', 'status', 'triage'],
      });
    });
  });

  describe('linkTriageAndUpdateStatus', () => {
    it('should execute update query with correct params', async () => {
      repo.query.mockResolvedValue(undefined);

      await service.linkTriageAndUpdateStatus(1, 5);

      expect(repo.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE falaidoutor.queue_triage'),
        [5, 1],
      );
    });
  });

  describe('getFinalizedTriages', () => {
    it('should return mapped triage list', async () => {
      const rows = [
        {
          queue_id: '1',
          name: 'João Silva',
          gender: 'M',
          age: '30',
          queue_ticket: 'A001',
          risk: 'Laranja',
          priority: 'Muito urgente',
        },
      ];
      repo.query.mockResolvedValue(rows);

      const result = await service.getFinalizedTriages();

      expect(result).toEqual([
        { queueId: 1, name: 'João Silva', gender: 'M', age: 30, queueTicket: 'A001', classificacao: 'Laranja', prioridade: 'Muito urgente' },
      ]);
    });

    it('should return empty array when no finalized triages', async () => {
      repo.query.mockResolvedValue([]);

      const result = await service.getFinalizedTriages();

      expect(result).toEqual([]);
    });
  });

  describe('getQueueTriageById', () => {
    it('should return finalized triage dto', async () => {
      const withTriage = { ...mockQueueTriage, triage: mockTriage, status: { id: 1, statusName: 'Finalizado' } };
      repo.findOne.mockResolvedValue(withTriage as any);

      const result = await service.getQueueTriageById(1);

      expect(result.queueId).toBe(1);
      expect(result.name).toBe('João Silva');
      expect(result.symptoms).toBe('Febre alta');
      expect(result.classificacao).toBe('Laranja');
      expect(result.prioridade).toBe('Muito urgente');
      expect(result.justificativa).toBe('Febre acima de 39°C');
      expect(result.createdAtDate).toBeDefined();
      expect(result.createdAtTime).toBeDefined();
    });

    it('should return empty strings for missing triage fields', async () => {
      repo.findOne.mockResolvedValue(mockQueueTriage as any);

      const result = await service.getQueueTriageById(1);

      expect(result.symptoms).toBe('');
      expect(result.classificacao).toBe('');
      expect(result.justificativa).toBe('');
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getQueueTriageById(99)).rejects.toThrow(NotFoundException);
      await expect(service.getQueueTriageById(99)).rejects.toThrow('Triagem com ID 99 não encontrada.');
    });
  });

  describe('sortByRiskPriority', () => {
    it('should sort triages by risk priority', () => {
      const triages: TriageListDto[] = [
        { queueId: 3, name: 'C', gender: 'M', age: 20, queueTicket: 'C001', classificacao: 'Verde', prioridade: 'Pouco urgente' },
        { queueId: 1, name: 'A', gender: 'F', age: 30, queueTicket: 'A001', classificacao: 'Vermelho', prioridade: 'Emergência' },
        { queueId: 2, name: 'B', gender: 'M', age: 25, queueTicket: 'B001', classificacao: 'Amarelo', prioridade: 'Urgente' },
      ];

      const sorted = service.sortByRiskPriority(triages);

      expect(sorted[0].classificacao).toBe('Vermelho');
      expect(sorted[1].classificacao).toBe('Amarelo');
      expect(sorted[2].classificacao).toBe('Verde');
    });

    it('should sort by queueTicket when risk is the same', () => {
      const triages: TriageListDto[] = [
        { queueId: 2, name: 'B', gender: 'M', age: 25, queueTicket: 'B001', classificacao: 'Amarelo', prioridade: 'Urgente' },
        { queueId: 1, name: 'A', gender: 'F', age: 30, queueTicket: 'A001', classificacao: 'Amarelo', prioridade: 'Urgente' },
      ];

      const sorted = service.sortByRiskPriority(triages);

      expect(sorted[0].queueTicket).toBe('A001');
      expect(sorted[1].queueTicket).toBe('B001');
    });

    it('should assign priority 6 to unknown risk levels', () => {
      const triages: TriageListDto[] = [
        { queueId: 1, name: 'A', gender: 'F', age: 30, queueTicket: 'A001', classificacao: 'Desconhecido', prioridade: '?' },
        { queueId: 2, name: 'B', gender: 'M', age: 25, queueTicket: 'B001', classificacao: 'Vermelho', prioridade: 'Emergência' },
      ];

      const sorted = service.sortByRiskPriority(triages);

      expect(sorted[0].classificacao).toBe('Vermelho');
      expect(sorted[1].classificacao).toBe('Desconhecido');
    });
  });
});
