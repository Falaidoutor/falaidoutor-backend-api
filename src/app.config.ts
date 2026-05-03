import { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from './shared/filters/http-exception.filter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableCors({ origin: '*' });
  app.useGlobalFilters(new GlobalExceptionFilter());
}
