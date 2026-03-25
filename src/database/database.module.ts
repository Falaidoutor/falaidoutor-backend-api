import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../shared/entities/patient.entity';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { StatusQueue } from '../shared/entities/status-queue.entity';
import { Triage } from '../shared/entities/triage.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.getOrThrow<number>('DB_PORT'),
        database: config.getOrThrow<string>('DB_NAME'),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        schema: config.getOrThrow<string>('DB_SCHEMA'),
        entities: [Patient, Triage, StatusQueue, QueueTriage],
        synchronize: false,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
