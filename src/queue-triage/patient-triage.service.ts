import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PatientTriage,
  PatientTriageStatus,
} from '../shared/entities/patient-triage.entity';
import { Patient } from '../shared/entities/patient.entity';
import { HttpCryptoService } from '../shared/crypto/http-crypto.service';
import { BusinessException } from '../shared/exceptions/business.exception';
import { CreatePatientTriageDto } from './dto/create-patient-triage.dto';
import { PatientTriageListQueryDto } from './dto/patient-triage-list-query.dto';
import { PatientTriageResponseDto } from './dto/patient-triage-response.dto';
import { PendingReviewTriageDto } from './dto/pending-review-triage.dto';
import { ProfessionalReviewTriageDto } from './dto/professional-review-triage.dto';

type AiTriageFields = {
  result: Record<string, any>;
  summary: string | null;
  suggestedRiskClassification: string | null;
  suggestedRiskColor: string | null;
  recommendedAction: string | null;
};

@Injectable()
export class PatientTriageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PatientTriageService.name);
  private readonly triageServiceUrl?: string;
  private readonly applicationKey?: string;
  private readonly schedulerEnabled: boolean;
  private readonly retryIntervalMs: number;
  private readonly retryDelayMinutes: number;
  private readonly retryBatchLimit: number;
  private retryInterval?: ReturnType<typeof setInterval>;

  constructor(
    @InjectRepository(PatientTriage)
    private readonly patientTriageRepository: Repository<PatientTriage>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly configService: ConfigService,
    private readonly httpCryptoService: HttpCryptoService,
  ) {
    this.triageServiceUrl = this.configService
      .get<string>('TRIAGE_SERVICE_URL')
      ?.trim()
      .replace(/\/$/, '');
    this.applicationKey = this.configService
      .get<string>('APPLICATION_KEY')
      ?.trim();
    this.schedulerEnabled =
      this.configService.get<string>('TRIAGE_AI_RETRY_ENABLED')?.trim() !==
      'false';
    this.retryIntervalMs = this.getPositiveNumber(
      'TRIAGE_AI_RETRY_INTERVAL_MS',
      60_000,
    );
    this.retryDelayMinutes = this.getPositiveNumber(
      'TRIAGE_AI_RETRY_DELAY_MINUTES',
      5,
    );
    this.retryBatchLimit = this.getPositiveNumber(
      'TRIAGE_AI_RETRY_BATCH_LIMIT',
      20,
    );
  }

  onModuleInit(): void {
    if (!this.schedulerEnabled) {
      return;
    }

    this.retryInterval = setInterval(() => {
      void this.processPendingAiTriages().catch((error) => {
        this.logger.error(
          `Erro na rotina de reprocessamento de IA: ${this.getErrorMessage(error)}`,
        );
      });
    }, this.retryIntervalMs);

    this.retryInterval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
  }

  async listPatientTriages(
    query: PatientTriageListQueryDto,
  ): Promise<PatientTriageResponseDto[]> {
    const patient = await this.getPatientByCpf(query.cpf);

    const triages = await this.patientTriageRepository.find({
      where: {
        patient: { id: patient.id },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return triages.map((triage) => this.toPatientResponseDto(triage));
  }

  async createPatientTriage(
    dto: CreatePatientTriageDto,
  ): Promise<PatientTriageResponseDto> {
    const symptoms = dto.symptoms.trim();

    if (!symptoms) {
      throw new BusinessException('Lista de sintomas nao pode ser vazia.');
    }

    const patient = await this.getPatientByCpf(dto.cpf);

    const triage = this.patientTriageRepository.create({
      patient,
      queueTriage: null,
      queueTicket: this.generateQueueTicket(),
      symptoms,
      status: PatientTriageStatus.Pending,
      aiProcessed: false,
      aiProcessing: false,
      aiAttempts: 0,
      professionalReviewed: false,
    });
    const savedTriage = await this.patientTriageRepository.save(triage);

    void this.processTriage(savedTriage.id).catch((error) => {
      this.logger.error(
        `Erro ao disparar processamento da triagem ${savedTriage.id}: ${this.getErrorMessage(error)}`,
      );
    });

    return this.toPatientResponseDto(savedTriage);
  }

  async getPendingProfessionalReview(): Promise<PendingReviewTriageDto[]> {
    const triages = await this.patientTriageRepository.find({
      where: {
        status: PatientTriageStatus.WaitingProfessionalReview,
        aiProcessed: true,
        professionalReviewed: false,
      },
      order: {
        aiProcessedAt: 'ASC',
        createdAt: 'ASC',
      },
    });

    return triages.map((triage) => this.toPendingReviewDto(triage));
  }

  async confirmProfessionalReview(
    triageId: number,
    dto: ProfessionalReviewTriageDto,
  ): Promise<PatientTriageResponseDto> {
    const triage = await this.patientTriageRepository.findOne({
      where: { id: triageId },
    });

    if (!triage) {
      throw new NotFoundException(`Triagem com ID ${triageId} nao encontrada.`);
    }

    if (!triage.aiProcessed) {
      throw new BusinessException('Triagem ainda nao processada pela IA.');
    }

    const professionalId = this.parseOptionalNumber(
      dto.professionalId,
      'ID do profissional invalido.',
    );
    const finalRiskClassification = dto.finalRiskClassification.trim();
    const finalRiskColor =
      dto.finalRiskColor?.trim() ||
      this.resolveRiskColor(finalRiskClassification);

    triage.professionalReviewed = true;
    triage.professionalId = professionalId;
    triage.professionalNotes = dto.professionalNotes?.trim() || null;
    triage.finalResult =
      dto.finalResult ??
      ({
        riskClassification: finalRiskClassification,
        riskColor: finalRiskColor,
        notes: triage.professionalNotes,
      } satisfies Record<string, any>);
    triage.finalRiskClassification = finalRiskClassification;
    triage.finalRiskColor = finalRiskColor;
    triage.professionalReviewedAt = new Date();
    triage.status = PatientTriageStatus.Completed;

    const savedTriage = await this.patientTriageRepository.save(triage);

    return this.toPatientResponseDto(savedTriage);
  }

  async processPendingAiTriages(): Promise<void> {
    const triages = await this.patientTriageRepository
      .createQueryBuilder('triage')
      .where('triage.ai_processed = FALSE')
      .andWhere('triage.ai_processing = FALSE')
      .andWhere('triage.status IN (:...statuses)', {
        statuses: [
          PatientTriageStatus.Pending,
          PatientTriageStatus.AiProcessing,
        ],
      })
      .andWhere(
        '(triage.next_ai_retry_at IS NULL OR triage.next_ai_retry_at <= NOW())',
      )
      .orderBy('triage.created_at', 'ASC')
      .limit(this.retryBatchLimit)
      .getMany();

    for (const triage of triages) {
      await this.processTriage(triage.id);
    }
  }

  private async processTriage(triageId: number): Promise<void> {
    const wasMarkedForProcessing =
      await this.markTriageAsProcessing(triageId);

    if (!wasMarkedForProcessing) {
      return;
    }

    const triage = await this.patientTriageRepository.findOne({
      where: { id: triageId },
    });

    if (!triage) {
      return;
    }

    try {
      const aiFields = await this.callAiTriage(triage);

      await this.patientTriageRepository.update(triageId, {
        aiProcessed: true,
        aiProcessing: false,
        status: PatientTriageStatus.WaitingProfessionalReview,
        aiResult: aiFields.result,
        aiSummary: aiFields.summary,
        aiSuggestedRiskClassification: aiFields.suggestedRiskClassification,
        aiSuggestedRiskColor: aiFields.suggestedRiskColor,
        aiRecommendedAction: aiFields.recommendedAction,
        aiProcessedAt: new Date(),
        aiError: null,
        nextAiRetryAt: null,
      });
    } catch (error) {
      await this.patientTriageRepository.update(triageId, {
        aiProcessed: false,
        aiProcessing: false,
        status: PatientTriageStatus.Pending,
        aiError: this.getErrorMessage(error),
        nextAiRetryAt: new Date(
          Date.now() + this.retryDelayMinutes * 60 * 1000,
        ),
      });
    }
  }

  private async markTriageAsProcessing(triageId: number): Promise<boolean> {
    const result = await this.patientTriageRepository
      .createQueryBuilder()
      .update(PatientTriage)
      .set({
        aiProcessing: true,
        status: PatientTriageStatus.AiProcessing,
        aiAttempts: () => 'ai_attempts + 1',
        lastAiAttemptAt: () => 'NOW()',
      })
      .where('id = :triageId', { triageId })
      .andWhere('ai_processed = FALSE')
      .andWhere('ai_processing = FALSE')
      .andWhere('status IN (:...statuses)', {
        statuses: [
          PatientTriageStatus.Pending,
          PatientTriageStatus.AiProcessing,
        ],
      })
      .andWhere('(next_ai_retry_at IS NULL OR next_ai_retry_at <= NOW())')
      .execute();

    return (result.affected ?? 0) > 0;
  }

  private async callAiTriage(triage: PatientTriage): Promise<AiTriageFields> {
    if (!this.triageServiceUrl) {
      throw new BusinessException('Servico de triagem indisponivel.');
    }

    if (!this.applicationKey) {
      throw new BusinessException('Chave de aplicacao nao configurada.');
    }

    const payload = {
      symptoms: triage.symptoms,
      triageId: triage.id,
      patientContext: {
        patientId: triage.patient.id,
        age: triage.patient.age,
        gender: triage.patient.gender,
      },
    };
    const response = await fetch(`${this.triageServiceUrl}/triage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-application-key': this.applicationKey,
        'x-payload-encrypted': 'true',
      },
      body: JSON.stringify(this.httpCryptoService.encrypt(payload)),
    });
    const responseBodyText = new TextDecoder('utf-8').decode(
      await response.arrayBuffer(),
    );
    const responseBody = responseBodyText ? JSON.parse(responseBodyText) : {};
    const decryptedBody = this.httpCryptoService.isEncryptedPayload(
      responseBody,
    )
      ? this.httpCryptoService.decrypt<Record<string, any>>(responseBody)
      : responseBody;
    const data = this.normalizeEncoding(decryptedBody);

    if (!response.ok) {
      throw new BusinessException(
        `Erro ao chamar servico de triagem: ${response.status} ${response.statusText} - ${this.describeAiError(data)}`,
      );
    }

    return this.toAiTriageFields(data);
  }

  private async getPatientByCpf(cpf: string): Promise<Patient> {
    const normalizedCpf = this.normalizeCpf(cpf);
    const patient = await this.patientRepository.findOne({
      where: { cpf: normalizedCpf },
    });

    if (!patient) {
      throw new BusinessException('Paciente nao encontrado.');
    }

    return patient;
  }

  private toPatientResponseDto(
    triage: PatientTriage,
  ): PatientTriageResponseDto {
    const isCompleted = triage.status === PatientTriageStatus.Completed;
    const riskClassification = isCompleted
      ? triage.finalRiskClassification
      : null;

    return {
      id: triage.id,
      symptoms: triage.symptoms,
      queueTicket: triage.queueTicket,
      symptomsPreview: this.previewSymptoms(triage.symptoms),
      createdAt: triage.createdAt.toISOString(),
      updatedAt: triage.updatedAt.toISOString(),
      status: triage.status,
      patientStatus: isCompleted ? 'ANALISADA' : 'PENDENTE',
      riskClassification,
      displayColor: isCompleted
        ? triage.finalRiskColor || this.resolveRiskColor(riskClassification)
        : 'yellow',
    };
  }

  private toPendingReviewDto(triage: PatientTriage): PendingReviewTriageDto {
    return {
      id: triage.id,
      patientId: triage.patient.id,
      patientName: triage.patient.name,
      patientAge: triage.patient.age,
      patientGender: triage.patient.gender,
      symptoms: triage.symptoms,
      aiSummary: triage.aiSummary,
      aiSuggestedRiskClassification: triage.aiSuggestedRiskClassification,
      aiSuggestedRiskColor: triage.aiSuggestedRiskColor,
      aiRecommendedAction: triage.aiRecommendedAction,
      aiResult: triage.aiResult
        ? this.withNormalizedConfidence(triage.aiResult)
        : null,
      createdAt: triage.createdAt.toISOString(),
      aiProcessedAt: triage.aiProcessedAt?.toISOString() ?? null,
      queueTriageId: triage.queueTriage?.id ?? null,
      queueTicket: triage.queueTicket,
    };
  }

  private toAiTriageFields(data: Record<string, any>): AiTriageFields {
    const result = this.withNormalizedConfidence(data);
    const suggestedRiskClassification = this.readString(data, [
      'suggestedRiskClassification',
      'classificacao',
    ]);
    const suggestedRiskColor =
      this.readString(data, ['suggestedRiskColor', 'riskColor']) ||
      this.resolveRiskColor(suggestedRiskClassification);

    return {
      result,
      summary: this.readString(data, ['summary', 'resumo', 'justificativa']),
      suggestedRiskClassification,
      suggestedRiskColor,
      recommendedAction: this.readString(data, [
        'recommendedAction',
        'acao_recomendada',
        'disclaimer',
      ]),
    };
  }

  private readString(
    data: Record<string, any>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = data[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
    }

    return null;
  }

  private withNormalizedConfidence(data: Record<string, any>): Record<string, any> {
    const confidenceLabel = this.readString(data, [
      'confidenceLabel',
      'confianca',
    ])?.toLowerCase();
    const confidence = this.readConfidence(data, confidenceLabel);

    if (confidence === null) {
      return data;
    }

    return {
      ...data,
      confidence,
      confidenceScore: confidence,
      confidenceLabel: confidenceLabel ?? data.confidenceLabel ?? null,
    };
  }

  private readConfidence(
    data: Record<string, any>,
    confidenceLabel?: string | null,
  ): number | null {
    const labelScores: Record<string, number> = {
      alta: 95,
      media: 90,
      média: 90,
      baixa: 35,
    };

    const labelScore = confidenceLabel
      ? (labelScores[confidenceLabel] ?? null)
      : null;
    if (labelScore !== null) {
      return labelScore;
    }

    const keys = ['confidence', 'confidenceScore', 'confidence_score', 'score'];

    for (const key of keys) {
      const numeric = this.toConfidenceNumber(data[key]);
      if (numeric !== null) {
        return numeric;
      }
    }

    return null;
  }

  private toConfidenceNumber(value: unknown): number | null {
    if (typeof value === 'boolean' || value === null || value === undefined) {
      return null;
    }

    let numeric: number;

    if (typeof value === 'number') {
      numeric = value;
    } else if (typeof value === 'string') {
      numeric = Number.parseFloat(
        value.trim().replace('%', '').replace(',', '.'),
      );
    } else {
      return null;
    }

    if (!Number.isFinite(numeric)) {
      return null;
    }

    if (numeric <= 1) {
      numeric *= 100;
    }

    if (numeric < 0 || numeric > 100) {
      return null;
    }

    return Math.round(numeric * 100) / 100;
  }

  private previewSymptoms(symptoms: string): string {
    return symptoms.length > 140 ? `${symptoms.substring(0, 137)}...` : symptoms;
  }

  private resolveRiskColor(riskClassification?: string | null): string {
    const risk = riskClassification?.trim().toUpperCase();
    const colors: Record<string, string> = {
      'ESI-1': '#a30000',
      'ESI-2': '#fe0000',
      'ESI-3': '#ffd900',
      'ESI-4': '#28a745',
      'ESI-5': '#00e5ff',
      VERMELHO: '#a30000',
      LARANJA: '#ff8c00',
      AMARELO: '#ffd900',
      VERDE: '#28a745',
      AZUL: '#00e5ff',
    };

    return risk ? (colors[risk] ?? '#6c757d') : '#6c757d';
  }

  private parseRequiredNumber(value: string, message: string): number {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isFinite(parsed)) {
      throw new BusinessException(message);
    }

    return parsed;
  }

  private parseOptionalNumber(
    value: string | undefined,
    message: string,
  ): number | null {
    if (!value?.trim()) {
      return null;
    }

    return this.parseRequiredNumber(value, message);
  }

  private getPositiveNumber(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private normalizeCpf(cpf: string): string {
    return (cpf ?? '').replace(/\D/g, '');
  }

  private generateQueueTicket(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `FD-${timestamp}-${suffix}`;
  }

  private describeAiError(data: Record<string, any>): string {
    const detail = data.detail ?? data.message ?? data.error ?? data;
    return typeof detail === 'string' ? detail : JSON.stringify(detail);
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private normalizeEncoding<T>(value: T): T {
    if (typeof value === 'string') {
      return this.fixMojibake(value) as T;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeEncoding(item)) as T;
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.normalizeEncoding(item),
        ]),
      ) as T;
    }

    return value;
  }

  private fixMojibake(value: string): string {
    if (!/(Ãƒ[\x80-\xBF]|Ã‚[Â°ÂºÂª ]|Ã¢[â‚¬Å“â‚¬ï¿½â„¢â‚¬â€œâ‚¬â€â€ ])/.test(value)) {
      return value;
    }

    return Buffer.from(value, 'latin1').toString('utf8');
  }
}
