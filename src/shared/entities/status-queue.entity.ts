import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'status_queue', schema: 'falaidoutor' })
export class StatusQueue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'status_name', nullable: false })
  statusName: string;
}
