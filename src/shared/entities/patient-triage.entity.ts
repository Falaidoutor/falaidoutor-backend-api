import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { QueueTriage } from './queue-triage.entity';

export enum PatientTriageStatus {
  Pending = 'PENDING',
  AiProcessing = 'AI_PROCESSING',
  WaitingProfessionalReview = 'WAITING_PROFESSIONAL_REVIEW',
  Completed = 'COMPLETED',
}

@Entity({ name: 'patient_triages', schema: 'falaidoutor' })
export class PatientTriage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Patient, { nullable: false, eager: true })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @ManyToOne(() => QueueTriage, { nullable: true, eager: true })
  @JoinColumn({ name: 'queue_triage_id' })
  queueTriage: QueueTriage | null;

  @Column({ name: 'queue_ticket', length: 30, nullable: false, unique: true })
  queueTicket: string;

  @Column({ nullable: false, type: 'text' })
  symptoms: string;

  @Column({
    type: 'enum',
    enum: PatientTriageStatus,
    enumName: 'patient_triage_status',
    default: PatientTriageStatus.Pending,
  })
  status: PatientTriageStatus;

  @Column({ name: 'ai_processed', nullable: false, default: false })
  aiProcessed: boolean;

  @Column({ name: 'ai_processing', nullable: false, default: false })
  aiProcessing: boolean;

  @Column({ name: 'ai_attempts', nullable: false, default: 0 })
  aiAttempts: number;

  @Column({ name: 'last_ai_attempt_at', type: 'timestamp', nullable: true })
  lastAiAttemptAt: Date | null;

  @Column({ name: 'next_ai_retry_at', type: 'timestamp', nullable: true })
  nextAiRetryAt: Date | null;

  @Column({ name: 'ai_error', type: 'text', nullable: true })
  aiError: string | null;

  @Column({ name: 'ai_result', type: 'jsonb', nullable: true })
  aiResult: Record<string, any> | null;

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary: string | null;

  @Column({
    name: 'ai_suggested_risk_classification',
    length: 50,
    nullable: true,
  })
  aiSuggestedRiskClassification: string | null;

  @Column({ name: 'ai_suggested_risk_color', length: 30, nullable: true })
  aiSuggestedRiskColor: string | null;

  @Column({ name: 'ai_recommended_action', type: 'text', nullable: true })
  aiRecommendedAction: string | null;

  @Column({ name: 'ai_processed_at', type: 'timestamp', nullable: true })
  aiProcessedAt: Date | null;

  @Column({
    name: 'professional_reviewed',
    nullable: false,
    default: false,
  })
  professionalReviewed: boolean;

  @Column({ name: 'professional_id', nullable: true })
  professionalId: number | null;

  @Column({ name: 'professional_notes', type: 'text', nullable: true })
  professionalNotes: string | null;

  @Column({ name: 'final_result', type: 'jsonb', nullable: true })
  finalResult: Record<string, any> | null;

  @Column({ name: 'final_risk_classification', length: 50, nullable: true })
  finalRiskClassification: string | null;

  @Column({ name: 'final_risk_color', length: 30, nullable: true })
  finalRiskColor: string | null;

  @Column({
    name: 'professional_reviewed_at',
    type: 'timestamp',
    nullable: true,
  })
  professionalReviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
