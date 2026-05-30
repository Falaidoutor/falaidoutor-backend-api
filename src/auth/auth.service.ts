import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../shared/entities/patient.entity';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async authenticate(cpf: string): Promise<AuthResponseDto> {
    const normalizedCpf = this.normalizeCpf(cpf);
    const patient = await this.patientRepository.findOne({
      where: { cpf: normalizedCpf },
    });

    if (!patient) {
      return new AuthResponseDto(false);
    }

    return new AuthResponseDto(
      true,
      patient.name,
      patient.id,
      patient.cpf,
    );
  }

  private normalizeCpf(cpf: string): string {
    return (cpf ?? '').replace(/\D/g, '');
  }
}
