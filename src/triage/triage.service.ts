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
  private readonly triageServiceUrl: string;

  constructor(
    @InjectRepository(Triage)
    private readonly triageRepository: Repository<Triage>,
    private readonly queueTriageService: QueueTriageService,
    private readonly configService: ConfigService,
  ) {
    this.triageServiceUrl = this.configService.getOrThrow<string>('TRIAGE_SERVICE_URL');
  }

  async createTriage(dto: TriageRequestDto): Promise<Triage> {
    const { queueId, queueTicket, symptoms } = dto;

    if (!symptoms || symptoms.trim().length === 0) {
      throw new BusinessException('Lista de sintomas não pode ser vazia.');
    }

    const queueIdNum = parseInt(queueId, 10);
    if (isNaN(queueIdNum)) {
      throw new BusinessException('ID da fila inválido.');
    }

    await this.queueTriageService.getValidQueueTriage(queueIdNum, queueTicket);

    const triage = await this.processAiTriage(symptoms);
    const savedTriage = await this.triageRepository.save(triage);

    await this.queueTriageService.linkTriageAndUpdateStatus(queueIdNum, savedTriage.id);

    return savedTriage;
  }

  async createTriageMock(symptoms: string): Promise<TriageResponseDto> {
    if (!symptoms || symptoms.trim().length === 0) {
      throw new BusinessException('Lista de sintomas não pode ser vazia.');
    }

    const triage = await this.processAiTriage(symptoms);

    return {
      symptoms: triage.symptoms,
      classificacao: triage.risk,
      prioridade: triage.priority,
      tempo_atendimento: triage.serviceTime,
      fluxograma_utilizado: triage.flowchart,
      discriminadores_ativados: triage.activatedDiscriminators,
      justificativa: triage.justification,
    };
  }

  private async processAiTriage(symptoms: string): Promise<Triage> {
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
    this.logger.log(`Resposta triagem: classificacao=${data.classificacao}, prioridade=${data.prioridade}`);

    return this.triageRepository.create({
      symptoms,
      risk: data.classificacao,
      priority: data.prioridade,
      serviceTime: data.tempo_atendimento,
      flowchart: data.fluxograma_utilizado,
      activatedDiscriminators: data.discriminadores_ativados,
      justification: data.justificativa,
    });
  }
}
