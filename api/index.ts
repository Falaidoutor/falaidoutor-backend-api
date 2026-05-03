import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';

type HttpServer = (req: unknown, res: unknown) => void;

let cachedServer: HttpServer | undefined;

async function bootstrapServer(): Promise<HttpServer> {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);
    configureApp(app);
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance() as HttpServer;
  }

  return cachedServer;
}

export default async function handler(req: unknown, res: unknown) {
  const server = await bootstrapServer();
  return server(req, res);
}
