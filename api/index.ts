import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';

type ServerlessRequest = {
  method?: string;
  url?: string;
};
type ServerlessResponse = {
  status: (statusCode: number) => ServerlessResponse;
  json: (body: unknown) => void;
};
type HttpServer = (req: ServerlessRequest, res: ServerlessResponse) => void;

let cachedServer: HttpServer | undefined;
const logger = new Logger('VercelHandler');

async function bootstrapServer(): Promise<HttpServer> {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);
    configureApp(app);
    await app.init();
    cachedServer = app.getHttpAdapter().getInstance() as HttpServer;
  }

  return cachedServer;
}

export default async function handler(
  req: ServerlessRequest,
  res: ServerlessResponse,
) {
  try {
    const server = await bootstrapServer();
    return server(req, res);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected bootstrap error';
    const stack = error instanceof Error ? error.stack : undefined;

    logger.error(
      `Failed to bootstrap function for ${req.method ?? 'UNKNOWN'} ${req.url ?? '/'}`,
      stack,
    );

    return res.status(500).json({
      statusCode: 500,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
