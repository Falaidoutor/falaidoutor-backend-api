import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../shared/entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  findAll(): Promise<Patient[]> {
    return this.patientRepository.find({ order: { name: 'ASC' } });
  }

  async findById(id: number): Promise<Patient> {
    const patient = await this.patientRepository.findOneBy({ id });
    if (!patient) {
      throw new NotFoundException(`Paciente com ID ${id} não encontrado.`);
    }
    return patient;
  }

  create(dto: CreatePatientDto): Promise<Patient> {
    const patient = this.patientRepository.create({
      ...dto,
      gender: dto.gender.toUpperCase(),
    });
    return this.patientRepository.save(patient);
  }

  async update(id: number, dto: UpdatePatientDto): Promise<Patient> {
    const existing = await this.findById(id);
    const updated = this.patientRepository.merge(existing, {
      ...dto,
      gender: dto.gender ? dto.gender.toUpperCase() : existing.gender,
    });
    return this.patientRepository.save(updated);
  }

  async remove(id: number): Promise<void> {
    await this.findById(id);
    await this.patientRepository.delete(id);
  }
}
