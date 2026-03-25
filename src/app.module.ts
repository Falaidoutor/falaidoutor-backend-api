import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { PatientModule } from './patient/patient.module';
import { QueueTriageModule } from './queue-triage/queue-triage.module';
import { TriageModule } from './triage/triage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    PatientModule,
    QueueTriageModule,
    TriageModule,
  ],
})
export class AppModule {}
