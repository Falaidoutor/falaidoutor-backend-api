import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../shared/exceptions/business.exception';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { FinalizedTriageDto } from './dto/finalized-triage.dto';
import { TriageListDto } from './dto/triage-list.dto';
import { RISK_PRIORITY, RiskLevel } from '../shared/constants/ai-system-prompt';

interface FinalizedTriageRow {
  queue_id: string;
  name: string;
  gender: string;
  age: string;
  queue_ticket: string;
  risk: string;
}

@Injectable()
export class QueueTriageService {
  constructor(
    @InjectRepository(QueueTriage)
    private readonly queueTriageRepository: Repository<QueueTriage>,
  ) {}

  async getValidQueueTriage(queueId: number, queueTicket: string): Promise<QueueTriage> {
    const queueTriage = await this.queueTriageRepository.findOne({
      where: { id: queueId, queueTicket },
      relations: ['patient', 'status', 'triage'],
    });

    if (!queueTriage) {
      throw new BusinessException('Ficha inválida.');
    }

    if (queueTriage.status.id !== 2) {
      throw new BusinessException('Ficha inválida ou já processada.');
    }

    return queueTriage;
  }

  async linkTriageAndUpdateStatus(queueId: number, triageId: number): Promise<void> {
    await this.queueTriageRepository.query(
      `UPDATE falaidoutor.queue_triage SET triage_id = $1, status_id = 1 WHERE id = $2`,
      [triageId, queueId],
    );
  }

  async getFinalizedTriages(): Promise<TriageListDto[]> {
    const rows: FinalizedTriageRow[] = await this.queueTriageRepository.query(`
      SELECT
        qt.id AS queue_id,
        p.name AS name,
        p.gender AS gender,
        p.age AS age,
        qt.queue_ticket AS queue_ticket,
        t.risk AS risk
      FROM falaidoutor.queue_triage qt
      LEFT JOIN falaidoutor.patient p ON qt.patient_id = p.id
      LEFT JOIN falaidoutor.triage t ON qt.triage_id = t.id
      LEFT JOIN falaidoutor.status_queue s ON qt.status_id = s.id
      WHERE qt.status_id = 1
      ORDER BY
        CASE t.risk
          WHEN 'ESI-1' THEN 1
          WHEN 'ESI-2' THEN 2
          WHEN 'ESI-3' THEN 3
          WHEN 'ESI-4' THEN 4
          WHEN 'ESI-5' THEN 5
          ELSE 6
        END ASC,
        qt.queue_ticket ASC
    `);

    return rows.map((row) => ({
      queueId: Number(row.queue_id),
      name: row.name,
      gender: row.gender,
      age: Number(row.age),
      queueTicket: row.queue_ticket,
      classificacao: row.risk,
      prioridade: RISK_PRIORITY[row.risk as RiskLevel] ? String(RISK_PRIORITY[row.risk as RiskLevel]) : '',
    }));
  }

  async getQueueTriageById(id: number): Promise<FinalizedTriageDto> {
    const queueTriage = await this.queueTriageRepository.findOne({
      where: { id },
      relations: ['patient', 'triage', 'status'],
    });

    if (!queueTriage) {
      throw new NotFoundException(`Triagem com ID ${id} não encontrada.`);
    }

    const { patient, triage, createdAt } = queueTriage;

    const dateObj = new Date(createdAt);
    const createdAtDate = dateObj.toLocaleDateString('pt-BR');
    const createdAtTime = dateObj.toLocaleTimeString('pt-BR');

    const risk = triage?.risk ?? '';

    const nivel = RISK_PRIORITY[risk as RiskLevel] ?? 0;
    const nomeNivelMap: Record<number, string> = {
      1: 'Ressuscitação',
      2: 'Emergente',
      3: 'Urgente',
      4: 'Menos urgente',
      5: 'Não urgente',
    };

    return {
      queueId: queueTriage.id,
      name: patient.name,
      gender: patient.gender,
      age: patient.age,
      queueTicket: queueTriage.queueTicket,
      symptoms: triage?.symptoms ?? '',
      classificacao: risk,
      nivel,
      nome_nivel: nomeNivelMap[nivel] ?? '',
      ponto_decisao_ativado: '',
      criterios_ponto_decisao: [],
      recursos_estimados: 0,
      justificativa: triage?.justification ?? '',
      createdAtDate,
      createdAtTime,
    };
  }

  sortByRiskPriority(triages: TriageListDto[]): TriageListDto[] {
    return triages.sort((a, b) => {
      const prioA = RISK_PRIORITY[a.classificacao as RiskLevel] ?? 6;
      const prioB = RISK_PRIORITY[b.classificacao as RiskLevel] ?? 6;
      return prioA - prioB || a.queueTicket.localeCompare(b.queueTicket);
    });
  }
}
