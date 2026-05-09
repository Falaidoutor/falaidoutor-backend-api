import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DocsController } from './docs/docs.controller';
import { PatientModule } from './patient/patient.module';
import { QueueTriageModule } from './queue-triage/queue-triage.module';
import { HttpCryptoService } from './shared/crypto/http-crypto.service';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';
import { HttpCryptoInterceptor } from './shared/interceptors/http-crypto.interceptor';
import { ApplicationKeyMiddleware } from './shared/middleware/application-key.middleware';
import { HttpCryptoMiddleware } from './shared/middleware/http-crypto.middleware';
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
  controllers: [DocsController],
  providers: [
    HttpCryptoService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCryptoInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(ApplicationKeyMiddleware, HttpCryptoMiddleware)
      .forRoutes('*');
  }
}
