import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BusinessException } from '../shared/exceptions/business.exception';
import {
  PatientTriage,
  PatientTriageStatus,
} from '../shared/entities/patient-triage.entity';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { Triage } from '../shared/entities/triage.entity';
import { FinalizedTriageDto } from './dto/finalized-triage.dto';
import { TriageListDto } from './dto/triage-list.dto';
import { UpdateFinalizedTriageDto } from './dto/update-finalized-triage.dto';
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
    @InjectRepository(Triage)
    private readonly triageRepository: Repository<Triage>,
    @InjectRepository(PatientTriage)
    private readonly patientTriageRepository: Repository<PatientTriage>,
  ) {}

  async getValidQueueTriage(
    queueId: number,
    queueTicket: string,
  ): Promise<QueueTriage> {
    const queueTriage = await this.queueTriageRepository.findOne({
      where: { id: queueId, queueTicket },
      relations: ['patient', 'status', 'triage'],
    });

    if (!queueTriage) {
      throw new BusinessException('Ficha inválida.');
    }

    if (queueTriage.status.id !== 0) {
      throw new BusinessException('Ficha inválida ou já processada.');
    }

    return queueTriage;
  }

  async linkTriageAndUpdateStatus(
    queueId: number,
    triageId: number,
  ): Promise<void> {
    await this.queueTriageRepository.query(
      `UPDATE falaidoutor.queue_triage SET triage_id = $1, status_id = 1 WHERE id = $2`,
      [triageId, queueId],
    );
  }

  async getMedicalCases(): Promise<TriageListDto[]> {
    const [finalizedTriages, patientTriages] = await Promise.all([
      this.getFinalizedTriages(),
      this.getPatientTriageCases(),
    ]);

    return this.sortByRiskPriority([...patientTriages, ...finalizedTriages]);
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
        AND t.status = 'A'
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
      source: 'queue-triage',
      name: row.name,
      gender: row.gender,
      age: Number(row.age),
      queueTicket: row.queue_ticket,
      classificacao: row.risk,
      prioridade: RISK_PRIORITY[row.risk as RiskLevel]
        ? String(RISK_PRIORITY[row.risk as RiskLevel])
        : '',
    }));
  }

  async getQueueTriageById(id: number): Promise<FinalizedTriageDto> {
    const queueTriage = await this.queueTriageRepository.findOne({
      where: { id },
      relations: ['patient', 'triage', 'status'],
    });

    if (!queueTriage?.triage || queueTriage.triage.status !== 'A') {
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

  async getPatientTriageById(id: number): Promise<FinalizedTriageDto> {
    const patientTriage = await this.patientTriageRepository.findOne({
      where: { id },
    });

    if (!patientTriage) {
      throw new NotFoundException(`Triagem com ID ${id} nao encontrada.`);
    }

    const risk =
      patientTriage.finalRiskClassification ||
      patientTriage.aiSuggestedRiskClassification ||
      (patientTriage.aiProcessing ? 'PROCESSANDO IA' : 'PENDENTE');
    const { createdAtDate, createdAtTime } = this.formatDateTime(
      patientTriage.createdAt,
    );

    return {
      queueId: patientTriage.queueTriage?.id ?? patientTriage.id,
      triageId: patientTriage.id,
      source: 'patient-triage',
      name: patientTriage.patient.name,
      gender: patientTriage.patient.gender,
      age: patientTriage.patient.age,
      queueTicket: patientTriage.queueTicket,
      symptoms: patientTriage.symptoms,
      classificacao: risk,
      nivel: this.getRiskPriority(risk),
      nome_nivel: this.getRiskLevelName(risk),
      ponto_decisao_ativado: '',
      criterios_ponto_decisao: [],
      recursos_estimados: 0,
      justificativa:
        patientTriage.aiSummary ||
        patientTriage.aiError ||
        'Aguardando processamento da IA.',
      createdAtDate,
      createdAtTime,
      aiRecommendedAction: patientTriage.aiRecommendedAction,
    };
  }

  async updateQueueTriage(
    id: number,
    dto: UpdateFinalizedTriageDto,
  ): Promise<FinalizedTriageDto> {
    const queueTriage = await this.getExistingQueueTriageWithTriage(id);
    const triage = queueTriage.triage;

    if (dto.symptoms !== undefined) {
      triage.symptoms = dto.symptoms;
    }

    if (dto.classificacao !== undefined) {
      triage.risk = dto.classificacao;
    }

    if (dto.justificativa !== undefined) {
      triage.justification = dto.justificativa;
    }

    await this.triageRepository.save(triage);

    return this.getQueueTriageById(id);
  }

  async removeQueueTriage(id: number): Promise<void> {
    const queueTriage = await this.getExistingQueueTriageWithTriage(id);
    const triageId = queueTriage.triage.id;

    await this.queueTriageRepository.manager.transaction(async (manager) => {
      await manager.update(Triage, triageId, { status: 'I' });
      await manager.query(
        `UPDATE falaidoutor.queue_triage SET triage_id = NULL, status_id = 0 WHERE id = $1`,
        [id],
      );
    });
  }

  sortByRiskPriority(triages: TriageListDto[]): TriageListDto[] {
    return triages.sort((a, b) => {
      const prioA = RISK_PRIORITY[a.classificacao as RiskLevel] ?? 6;
      const prioB = RISK_PRIORITY[b.classificacao as RiskLevel] ?? 6;
      return prioA - prioB || a.queueTicket.localeCompare(b.queueTicket);
    });
  }

  private async getPatientTriageCases(): Promise<TriageListDto[]> {
    const triages = await this.patientTriageRepository.find({
      where: {
        status: In([
          PatientTriageStatus.Pending,
          PatientTriageStatus.AiProcessing,
          PatientTriageStatus.WaitingProfessionalReview,
          PatientTriageStatus.Completed,
        ]),
      },
      order: {
        createdAt: 'ASC',
      },
    });

    return triages.map((triage) => {
      const risk =
        triage.finalRiskClassification ||
        triage.aiSuggestedRiskClassification ||
        (triage.aiProcessing ? 'PROCESSANDO IA' : 'PENDENTE');

      return {
        queueId: triage.queueTriage?.id ?? triage.id,
        triageId: triage.id,
        source: 'patient-triage',
        name: triage.patient.name,
        gender: triage.patient.gender,
        age: triage.patient.age,
        queueTicket: triage.queueTicket,
        classificacao: risk,
        prioridade: this.getRiskPriority(risk)
          ? String(this.getRiskPriority(risk))
          : '',
        status: triage.status,
      };
    });
  }

  private getRiskPriority(risk: string | null | undefined): number {
    return RISK_PRIORITY[risk as RiskLevel] ?? 0;
  }

  private getRiskLevelName(risk: string | null | undefined): string {
    const nivel = this.getRiskPriority(risk);
    const nomeNivelMap: Record<number, string> = {
      1: 'Ressuscitacao',
      2: 'Emergente',
      3: 'Urgente',
      4: 'Menos urgente',
      5: 'Nao urgente',
    };

    return nomeNivelMap[nivel] ?? '';
  }

  private formatDateTime(date: Date): {
    createdAtDate: string;
    createdAtTime: string;
  } {
    return {
      createdAtDate: date.toLocaleDateString('pt-BR'),
      createdAtTime: date.toLocaleTimeString('pt-BR'),
    };
  }

  private async getExistingQueueTriageWithTriage(
    id: number,
  ): Promise<QueueTriage & { triage: Triage }> {
    const queueTriage = await this.queueTriageRepository.findOne({
      where: { id },
      relations: ['patient', 'triage', 'status'],
    });

    if (!queueTriage?.triage || queueTriage.triage.status !== 'A') {
      throw new NotFoundException(`Triagem com ID ${id} nÃ£o encontrada.`);
    }

    return queueTriage as QueueTriage & { triage: Triage };
  }
}
