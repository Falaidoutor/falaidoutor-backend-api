import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'triage', schema: 'falaidoutor' })
export class Triage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'text' })
  symptoms: string;

  @Column({ nullable: false })
  risk: string;

  @Column({ nullable: false, type: 'text' })
  justification: string;
}
