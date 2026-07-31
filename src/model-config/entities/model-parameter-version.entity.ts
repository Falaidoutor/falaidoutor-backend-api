import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'model_parameter_versions', schema: 'falaidoutor' })
export class ModelParameterVersion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'model_name', length: 120 })
  modelName: string;

  @Column({ length: 50, default: 'groq' })
  provider: string;

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string;

  @Column({ type: 'numeric', precision: 4, scale: 3, default: 0.2 })
  temperature: number;

  @Column({
    name: 'top_p',
    type: 'numeric',
    precision: 4,
    scale: 3,
    default: 0.9,
  })
  topP: number;

  @Column({ name: 'rag_enabled', default: true })
  ragEnabled: boolean;

  @Column({ name: 'streaming_enabled', default: true })
  streamingEnabled: boolean;

  @Column({
    name: 'version_label',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  versionLabel: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 120, nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
