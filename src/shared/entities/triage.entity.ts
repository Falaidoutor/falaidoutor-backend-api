import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'triage', schema: 'falaidoutor' })
export class Triage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'text' })
  symptoms: string;

  @Column({ nullable: false })
  risk: string;

  @Column({ nullable: false })
  priority: string;

  @Column({ name: 'service_time', nullable: false })
  serviceTime: string;

  @Column({ name: 'flowchart', nullable: false })
  flowchart: string;

  @Column({ name: 'activated_discriminators', type: 'text', array: true, nullable: false })
  activatedDiscriminators: string[];

  @Column({ nullable: false, type: 'text' })
  justification: string;
}
