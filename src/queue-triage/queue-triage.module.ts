import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpCryptoService } from '../shared/crypto/http-crypto.service';
import { Patient } from '../shared/entities/patient.entity';
import { PatientTriage } from '../shared/entities/patient-triage.entity';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { Triage } from '../shared/entities/triage.entity';
import { PatientTriageService } from './patient-triage.service';
import { QueueTriageController } from './queue-triage.controller';
import { QueueTriageService } from './queue-triage.service';
import { ModelConfigModule } from '../model-config/model-config.module';

@Module({
  imports: [TypeOrmModule.forFeature([QueueTriage, Triage, PatientTriage, Patient]), ModelConfigModule],
  controllers: [QueueTriageController],
  providers: [QueueTriageService, PatientTriageService, HttpCryptoService],
  exports: [QueueTriageService, PatientTriageService],
})
export class QueueTriageModule {}
