import { BadRequestException, Injectable } from '@nestjs/common';
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
  constructor(
    @InjectRepository(ModelParameterVersion)
    private readonly repository: Repository<ModelParameterVersion>,
  ) {}

  async getLatest(): Promise<ActiveModelConfig> {
    const rows = await this.repository.query<ModelParameterVersion[]>(`
      SELECT
        id,
        model_name AS "modelName",
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

    return this.toConfig(rows[0]);
  }

  async createVersion(dto: UpdateModelConfigDto): Promise<ActiveModelConfig> {
    if (dto.modelName.trim() === REMOVED_MODEL) {
      throw new BadRequestException('O modelo Llama 3.3 70B Versatile não está mais disponível.');
    }
    if (!MODEL_ORDER.includes(dto.modelName.trim() as (typeof MODEL_ORDER)[number])) {
      throw new BadRequestException('Modelo não suportado. Selecione um modelo disponível.');
    }
    const version = this.repository.create({
      modelName: this.normalizeModelName(dto.modelName),
      provider: dto.provider.trim(),
      systemPrompt: dto.systemPrompt.trim(),
      temperature: dto.temperature,
      topP: dto.topP,
      ragEnabled: dto.ragEnabled ?? true,
      streamingEnabled: dto.streamingEnabled ?? true,
      versionLabel: dto.versionLabel?.trim() || null,
      createdBy: dto.createdBy?.trim() || null,
    });

    return this.toConfig(await this.repository.save(version));
  }

  private toConfig(value: ModelParameterVersion): ActiveModelConfig {
    return {
      id: String(value.id),
      modelName: this.normalizeModelName(value.modelName),
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
}
