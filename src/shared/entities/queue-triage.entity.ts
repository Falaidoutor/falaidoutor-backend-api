import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { StatusQueue } from './status-queue.entity';
import { Triage } from './triage.entity';

@Entity({ name: 'queue_triage', schema: 'falaidoutor' })
export class QueueTriage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'queue_ticket', nullable: false })
  queueTicket: string;

  @ManyToOne(() => Patient, { nullable: false, eager: true })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @OneToOne(() => Triage, { nullable: true, eager: true })
  @JoinColumn({ name: 'triage_id' })
  triage: Triage | null;

  @ManyToOne(() => StatusQueue, { nullable: false, eager: true })
  @JoinColumn({ name: 'status_id' })
  status: StatusQueue;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
