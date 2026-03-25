import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'patient', schema: 'falaidoutor' })
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false, unique: true })
  cpf: string;

  @Column({ nullable: false })
  age: number;

  @Column({ type: 'char', length: 1, nullable: false })
  gender: string;
}
