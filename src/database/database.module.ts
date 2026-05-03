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
    retryAttempts: Number(config.get<string>('DB_RETRY_ATTEMPTS', '1')),
    retryDelay: Number(config.get<string>('DB_RETRY_DELAY', '1000')),
    extra: {
      connectionTimeoutMillis: Number(
        config.get<string>('DB_CONNECTION_TIMEOUT_MS', '5000'),
      ),
    },
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
  const requiredVariables = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
  ];
  const missingVariables = requiredVariables.filter(
    (key) => !config.get<string>(key),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Database configuration missing. Set DATABASE_URL or these variables: ${missingVariables.join(', ')}`,
    );
  }

  return {
    ...baseConfig,
    host: config.get<string>('DB_HOST'),
    port: Number(config.get<string>('DB_PORT')),
    database: config.get<string>('DB_NAME'),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
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
