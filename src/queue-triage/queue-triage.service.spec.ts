import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../shared/exceptions/business.exception';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { Triage } from '../shared/entities/triage.entity';
import { QueueTriageService } from './queue-triage.service';
import { TriageListDto } from './dto/triage-list.dto';

const mockPatient = {
  id: 1,
  name: 'João Silva',
  cpf: '12345678901',
  age: 30,
  gender: 'M',
};
const mockTriage = {
  id: 1,
  symptoms: 'Febre alta',
  risk: 'ESI-2',
  status: 'A',
  justification: 'Febre acima de 39°C',
};
const mockStatus = { id: 0, statusName: 'Em Aberto' };

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
  let triageRepo: jest.Mocked<Repository<Triage>>;
  let manager: { query: jest.Mock; update: jest.Mock };

  beforeEach(async () => {
    manager = {
      query: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueTriageService,
        {
          provide: getRepositoryToken(QueueTriage),
          useValue: {
            findOne: jest.fn(),
            query: jest.fn(),
            manager: {
              transaction: jest.fn(async (callback) => callback(manager)),
            },
          },
        },
        {
          provide: getRepositoryToken(Triage),
          useValue: {
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(QueueTriageService);
    repo = module.get(getRepositoryToken(QueueTriage));
    triageRepo = module.get(getRepositoryToken(Triage));
  });

  describe('getValidQueueTriage', () => {
    it('should return queue triage when valid and pending', async () => {
      repo.findOne.mockResolvedValue(mockQueueTriage as any);

      const result = await service.getValidQueueTriage(1, 'A001');

      expect(result).toBe(mockQueueTriage);
    });

    it('should throw BusinessException when queue triage not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getValidQueueTriage(99, 'Z999')).rejects.toThrow(
        BusinessException,
      );
      await expect(service.getValidQueueTriage(99, 'Z999')).rejects.toThrow(
        'Ficha inválida.',
      );
    });

    it('should throw BusinessException when status is not 0 (already processed)', async () => {
      const finalized = {
        ...mockQueueTriage,
        status: { id: 1, statusName: 'Finalizado' },
      };
      repo.findOne.mockResolvedValue(finalized as any);

      await expect(service.getValidQueueTriage(1, 'A001')).rejects.toThrow(
        BusinessException,
      );
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
          risk: 'ESI-2',
        },
      ];
      repo.query.mockResolvedValue(rows);

      const result = await service.getFinalizedTriages();

      expect(result).toEqual([
        {
          queueId: 1,
          name: 'João Silva',
          gender: 'M',
          age: 30,
          queueTicket: 'A001',
          classificacao: 'ESI-2',
          prioridade: '2',
        },
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
      const withTriage = {
        ...mockQueueTriage,
        triage: mockTriage,
        status: { id: 1, statusName: 'Finalizado' },
      };
      repo.findOne.mockResolvedValue(withTriage as any);

      const result = await service.getQueueTriageById(1);

      expect(result.queueId).toBe(1);
      expect(result.name).toBe('João Silva');
      expect(result.symptoms).toBe('Febre alta');
      expect(result.classificacao).toBe('ESI-2');
      expect(result.nivel).toBe(2);
      expect(result.nome_nivel).toBe('Emergente');
      expect(result.justificativa).toBe('Febre acima de 39°C');
      expect(result.createdAtDate).toBeDefined();
      expect(result.createdAtTime).toBeDefined();
    });

    it('should throw NotFoundException when triage is missing', async () => {
      repo.findOne.mockResolvedValue(mockQueueTriage as any);

      await expect(service.getQueueTriageById(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when triage is inactive', async () => {
      repo.findOne.mockResolvedValue({
        ...mockQueueTriage,
        triage: { ...mockTriage, status: 'I' },
      } as any);

      await expect(service.getQueueTriageById(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.getQueueTriageById(99)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getQueueTriageById(99)).rejects.toThrow(
        'Triagem com ID 99 não encontrada.',
      );
    });
  });

  describe('updateQueueTriage', () => {
    it('should update linked triage and return refreshed details', async () => {
      const withTriage = {
        ...mockQueueTriage,
        triage: { ...mockTriage },
        status: { id: 1, statusName: 'Finalizado' },
      };
      repo.findOne.mockResolvedValue(withTriage as any);
      triageRepo.save.mockResolvedValue(withTriage.triage as any);

      const result = await service.updateQueueTriage(1, {
        symptoms: 'Tosse persistente',
        classificacao: 'ESI-3',
        justificativa: 'Sem sinais de alto risco',
      });

      expect(triageRepo.save).toHaveBeenCalledWith({
        id: 1,
        symptoms: 'Tosse persistente',
        risk: 'ESI-3',
        justification: 'Sem sinais de alto risco',
        status: 'A',
      });
      expect(result.queueId).toBe(1);
    });

    it('should throw NotFoundException when triage is not linked', async () => {
      repo.findOne.mockResolvedValue(mockQueueTriage as any);

      await expect(
        service.updateQueueTriage(1, { symptoms: 'Dor' }),
      ).rejects.toThrow(NotFoundException);
      expect(triageRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('removeQueueTriage', () => {
    it('should mark triage as inactive, unlink queue triage and reset status', async () => {
      const withTriage = {
        ...mockQueueTriage,
        triage: mockTriage,
        status: { id: 1, statusName: 'Finalizado' },
      };
      repo.findOne.mockResolvedValue(withTriage as any);

      await service.removeQueueTriage(1);

      expect(repo.manager.transaction).toHaveBeenCalled();
      expect(manager.update).toHaveBeenCalledWith(Triage, 1, { status: 'I' });
      expect(manager.query).toHaveBeenCalledWith(
        'UPDATE falaidoutor.queue_triage SET triage_id = NULL, status_id = 0 WHERE id = $1',
        [1],
      );
    });

    it('should throw NotFoundException when queue triage has no triage', async () => {
      repo.findOne.mockResolvedValue(mockQueueTriage as any);

      await expect(service.removeQueueTriage(1)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when triage is already inactive', async () => {
      repo.findOne.mockResolvedValue({
        ...mockQueueTriage,
        triage: { ...mockTriage, status: 'I' },
      } as any);

      await expect(service.removeQueueTriage(1)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('sortByRiskPriority', () => {
    it('should sort triages by risk priority', () => {
      const triages: TriageListDto[] = [
        {
          queueId: 3,
          name: 'C',
          gender: 'M',
          age: 20,
          queueTicket: 'C001',
          classificacao: 'ESI-4',
          prioridade: '4',
        },
        {
          queueId: 1,
          name: 'A',
          gender: 'F',
          age: 30,
          queueTicket: 'A001',
          classificacao: 'ESI-1',
          prioridade: '1',
        },
        {
          queueId: 2,
          name: 'B',
          gender: 'M',
          age: 25,
          queueTicket: 'B001',
          classificacao: 'ESI-3',
          prioridade: '3',
        },
      ];

      const sorted = service.sortByRiskPriority(triages);

      expect(sorted[0].classificacao).toBe('ESI-1');
      expect(sorted[1].classificacao).toBe('ESI-3');
      expect(sorted[2].classificacao).toBe('ESI-4');
    });

    it('should sort by queueTicket when risk is the same', () => {
      const triages: TriageListDto[] = [
        {
          queueId: 2,
          name: 'B',
          gender: 'M',
          age: 25,
          queueTicket: 'B001',
          classificacao: 'ESI-3',
          prioridade: '3',
        },
        {
          queueId: 1,
          name: 'A',
          gender: 'F',
          age: 30,
          queueTicket: 'A001',
          classificacao: 'ESI-3',
          prioridade: '3',
        },
      ];

      const sorted = service.sortByRiskPriority(triages);

      expect(sorted[0].queueTicket).toBe('A001');
      expect(sorted[1].queueTicket).toBe('B001');
    });

    it('should assign priority 6 to unknown risk levels', () => {
      const triages: TriageListDto[] = [
        {
          queueId: 1,
          name: 'A',
          gender: 'F',
          age: 30,
          queueTicket: 'A001',
          classificacao: 'Desconhecido',
          prioridade: '?',
        },
        {
          queueId: 2,
          name: 'B',
          gender: 'M',
          age: 25,
          queueTicket: 'B001',
          classificacao: 'ESI-1',
          prioridade: '1',
        },
      ];

      const sorted = service.sortByRiskPriority(triages);

      expect(sorted[0].classificacao).toBe('ESI-1');
      expect(sorted[1].classificacao).toBe('Desconhecido');
    });
  });
});
