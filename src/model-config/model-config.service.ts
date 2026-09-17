import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelParameterVersion } from './entities/model-parameter-version.entity';
import { UpdateModelConfigDto } from './dto/update-model-config.dto';

export const MODEL_ORDER = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
] as const;
const REMOVED_MODEL = 'llama-3.3-70b-versatile';
const LEGACY_QWEN_MODEL = 'qwen/qwen3-32b';

export type ActiveModelConfig = {
  id: string;
  modelName: string;
  modelOrder: string[];
  provider: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  ragEnabled: boolean;
  streamingEnabled: boolean;
  versionLabel: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ModelConfigService {
  private readonly logger = new Logger(ModelConfigService.name);
  constructor(
    @InjectRepository(ModelParameterVersion)
    private readonly repository: Repository<ModelParameterVersion>,
  ) {}

  async getLatest(): Promise<ActiveModelConfig> {
    const startedAt = Date.now();
    this.logger.debug('model_config.load_start');
    const rows = await this.repository.query<ModelParameterVersion[]>(`
      SELECT
        id,
        model_name AS "modelName",
        model_order AS "modelOrder",
        provider,
        system_prompt AS "systemPrompt",
        temperature,
        top_p AS "topP",
        rag_enabled AS "ragEnabled",
        streaming_enabled AS "streamingEnabled",
        version_label AS "versionLabel",
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM falaidoutor.model_parameter_versions
      ORDER BY GREATEST(updated_at, created_at) DESC, id DESC
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new Error(
        'Nenhuma versão de configuração do modelo foi cadastrada.',
      );
    }

    const config = this.toConfig(rows[0]);
    this.logger.log(
      `model_config.loaded model=${config.modelName} order=${config.modelOrder.join(',')} elapsed_ms=${Date.now() - startedAt}`,
    );
    return config;
  }

  async createVersion(dto: UpdateModelConfigDto): Promise<ActiveModelConfig> {
    this.logger.log(
      `model_config.create_start requested_model=${dto.modelName} requested_order=${(dto.modelOrder ?? []).join(',')}`,
    );
    if (dto.modelName.trim() === REMOVED_MODEL) {
      throw new BadRequestException('O modelo Llama 3.3 70B Versatile não está mais disponível.');
    }
    if (!MODEL_ORDER.includes(dto.modelName.trim() as (typeof MODEL_ORDER)[number])) {
      throw new BadRequestException('Modelo não suportado. Selecione um modelo disponível.');
    }
    const version = this.repository.create({
      modelName: this.normalizeModelName(dto.modelOrder?.[0] ?? dto.modelName),
      modelOrder: this.normalizeModelOrder(dto.modelOrder),
      provider: dto.provider.trim(),
      systemPrompt: dto.systemPrompt.trim(),
      temperature: dto.temperature,
      topP: dto.topP,
      ragEnabled: dto.ragEnabled ?? true,
      streamingEnabled: dto.streamingEnabled ?? true,
      versionLabel: dto.versionLabel?.trim() || null,
      createdBy: dto.createdBy?.trim() || null,
    });

    const config = this.toConfig(await this.repository.save(version));
    this.logger.log(
      `model_config.created model=${config.modelName} order=${config.modelOrder.join(',')}`,
    );
    return config;
  }

  private toConfig(value: ModelParameterVersion): ActiveModelConfig {
    return {
      id: String(value.id),
      modelName: this.normalizeModelName(value.modelName),
      modelOrder: this.normalizeModelOrder(value.modelOrder),
      provider: value.provider,
      systemPrompt: value.systemPrompt,
      temperature: Number(value.temperature),
      topP: Number(value.topP),
      ragEnabled: value.ragEnabled,
      streamingEnabled: value.streamingEnabled,
      versionLabel: value.versionLabel,
      createdBy: value.createdBy,
      createdAt: new Date(value.createdAt).toISOString(),
      updatedAt: new Date(value.updatedAt).toISOString(),
    };
  }

  private normalizeModelName(modelName: string): string {
    const normalized = modelName.trim();
    if (normalized === REMOVED_MODEL) return MODEL_ORDER[0];
    if (normalized === LEGACY_QWEN_MODEL) return 'qwen/qwen3.8-27b';
    return normalized;
  }

  private normalizeModelOrder(order?: string[] | null): string[] {
    const normalized = (order ?? [])
      .map((model) => this.normalizeModelName(model))
      .filter((model, index, models) => MODEL_ORDER.includes(model as (typeof MODEL_ORDER)[number]) && models.indexOf(model) === index);
    return [...normalized, ...MODEL_ORDER.filter((model) => !normalized.includes(model))];
  }
}
