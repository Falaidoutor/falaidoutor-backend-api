import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '../shared/exceptions/business.exception';
import { Triage } from '../shared/entities/triage.entity';
import { QueueTriageService } from '../queue-triage/queue-triage.service';
import { TriageRequestDto } from './dto/triage-request.dto';
import { TriageResponseDto } from './dto/triage-response.dto';

@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);
  private readonly triageServiceUrl?: string;

  constructor(
    @InjectRepository(Triage)
    private readonly triageRepository: Repository<Triage>,
    private readonly queueTriageService: QueueTriageService,
    private readonly configService: ConfigService,
  ) {
    this.triageServiceUrl = this.configService
      .get<string>('TRIAGE_SERVICE_URL')
      ?.trim()
      .replace(/\/$/, '');
  }

  async createTriage(dto: TriageRequestDto): Promise<TriageResponseDto> {
    const { queueId, queueTicket, symptoms } = dto;

    if (!symptoms || symptoms.trim().length === 0) {
      throw new BusinessException('Lista de sintomas não pode ser vazia.');
    }

    const queueIdNum = parseInt(queueId, 10);
    if (isNaN(queueIdNum)) {
      throw new BusinessException('ID da fila inválido.');
    }

    await this.queueTriageService.getValidQueueTriage(queueIdNum, queueTicket);

    const { triage, aiData } = await this.processAiTriage(symptoms);
    const savedTriage = await this.triageRepository.save(triage);

    await this.queueTriageService.linkTriageAndUpdateStatus(queueIdNum, savedTriage.id);

    return this.toTriageResponseDto(symptoms, savedTriage.risk, savedTriage.justification, aiData);
  }

  async createTriageMock(symptoms: string): Promise<TriageResponseDto> {
    if (!symptoms || symptoms.trim().length === 0) {
      throw new BusinessException('Lista de sintomas não pode ser vazia.');
    }

    const { triage, aiData } = await this.processAiTriage(symptoms);

    return this.toTriageResponseDto(triage.symptoms, triage.risk, triage.justification, aiData);
  }

  private toTriageResponseDto(
    symptoms: string,
    classificacao: string,
    justificativa: string,
    aiData: Record<string, any>,
  ): TriageResponseDto {
    return {
      symptoms,
      classificacao,
      nivel: aiData.nivel,
      nome_nivel: aiData.nome_nivel,
      ponto_decisao_ativado: aiData.ponto_decisao_ativado,
      criterios_ponto_decisao: aiData.criterios_ponto_decisao,
      recursos_estimados: aiData.recursos_estimados,
      justificativa,
    };
  }

  private async processAiTriage(symptoms: string): Promise<{ triage: Triage; aiData: Record<string, any> }> {
    if (!this.triageServiceUrl) {
      throw new BusinessException('Serviço de triagem indisponível.');
    }

    this.logger.log(`Processando triagem AI para sintomas: ${symptoms.substring(0, 80)}...`);

    const response = await fetch(`${this.triageServiceUrl}/triage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms }),
    });

    if (!response.ok) {
      throw new BusinessException(`Erro ao chamar serviço de triagem: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    this.logger.log(`Resposta triagem: classificacao=${data.classificacao}, nivel=${data.nivel}`);

    const triage = this.triageRepository.create({
      symptoms,
      risk: data.classificacao,
      justification: data.justificativa,
    });

    return { triage, aiData: data };
  }
}
