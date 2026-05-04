import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class ApplicationKeyMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const expectedKey = this.configService.get<string>('APPLICATION_KEY')?.trim();
    const headerValue = req.headers['x-application-key'];
    const applicationKey = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!expectedKey) {
      throw new UnauthorizedException('Application key is not configured.');
    }

    if (!applicationKey || applicationKey !== expectedKey) {
      throw new UnauthorizedException('Invalid application key.');
    }

    next();
  }
}
