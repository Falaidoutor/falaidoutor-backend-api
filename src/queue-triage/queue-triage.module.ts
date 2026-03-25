import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { QueueTriageController } from './queue-triage.controller';
import { QueueTriageService } from './queue-triage.service';

@Module({
  imports: [TypeOrmModule.forFeature([QueueTriage])],
  controllers: [QueueTriageController],
  providers: [QueueTriageService],
  exports: [QueueTriageService],
})
export class QueueTriageModule {}
