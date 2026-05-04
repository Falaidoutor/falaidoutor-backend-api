import { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-application-key'],
  });
  app.useGlobalFilters(new GlobalExceptionFilter());
}
