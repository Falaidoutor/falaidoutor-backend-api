import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(QueueTriage)
    private readonly queueTriageRepository: Repository<QueueTriage>,
  ) {}

  async authenticate(cpf: string, queueTicket: string): Promise<AuthResponseDto> {
    const queueTriage = await this.queueTriageRepository.findOne({
      where: {
        queueTicket,
        patient: { cpf },
      },
      relations: ['patient', 'status'],
    });

    if (!queueTriage) {
      return new AuthResponseDto(false);
    }

    return new AuthResponseDto(
      true,
      queueTriage.patient.name,
      queueTriage.id,
      queueTriage.status.id,
    );
  }
}
