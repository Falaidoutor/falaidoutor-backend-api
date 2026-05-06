import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { Triage } from '../shared/entities/triage.entity';
import { QueueTriageController } from './queue-triage.controller';
import { QueueTriageService } from './queue-triage.service';

@Module({
  imports: [TypeOrmModule.forFeature([QueueTriage, Triage])],
  controllers: [QueueTriageController],
  providers: [QueueTriageService],
  exports: [QueueTriageService],
})
export class QueueTriageModule {}
