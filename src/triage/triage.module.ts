import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Triage } from '../shared/entities/triage.entity';
import { QueueTriageModule } from '../queue-triage/queue-triage.module';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Triage]), QueueTriageModule],
  controllers: [TriageController],
  providers: [TriageService],
})
export class TriageModule {}
