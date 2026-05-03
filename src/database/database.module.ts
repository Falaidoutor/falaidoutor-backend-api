import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Patient } from '../shared/entities/patient.entity';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { StatusQueue } from '../shared/entities/status-queue.entity';
import { Triage } from '../shared/entities/triage.entity';

const entities = [Patient, Triage, StatusQueue, QueueTriage];

function getDatabaseConfig(config: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = config.get<string>('DATABASE_URL');
  const schema = config.get<string>('DB_SCHEMA', 'public');
  const sslConfig = (enabled: boolean) =>
    enabled ? { rejectUnauthorized: false } : false;

  const baseConfig = {
    type: 'postgres',
    schema,
    entities,
    synchronize: false,
    logging: false,
  } satisfies TypeOrmModuleOptions;

  if (databaseUrl) {
    const sslEnabled = config.get<string>('DB_SSL', 'true') !== 'false';

    return {
      ...baseConfig,
      url: databaseUrl,
      ssl: sslConfig(sslEnabled),
    };
  }

  const sslEnabled = config.get<string>('DB_SSL', 'false') === 'true';

  return {
    ...baseConfig,
    host: config.getOrThrow<string>('DB_HOST'),
    port: Number(config.getOrThrow<string>('DB_PORT')),
    database: config.getOrThrow<string>('DB_NAME'),
    username: config.getOrThrow<string>('DB_USERNAME'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    ssl: sslConfig(sslEnabled),
  };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
  ],
})
export class DatabaseModule {}
