import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { HttpCryptoService } from '../crypto/http-crypto.service';

export type CryptoRequest = Request & {
  httpPayloadEncrypted?: boolean;
};

@Injectable()
export class HttpCryptoMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpCryptoService: HttpCryptoService,
  ) {}

  use(req: CryptoRequest, _res: Response, next: NextFunction): void {
    if (this.isPublicDocumentationRoute(req)) {
      return next();
    }

    const encryptedHeader =
      this.getHeader(req, 'x-payload-encrypted') === 'true';
    const bodyWasEncrypted = this.decryptBody(req);
    const queryWasEncrypted = this.decryptQuery(req);

    req.httpPayloadEncrypted =
      encryptedHeader || bodyWasEncrypted || queryWasEncrypted;

    if (this.encryptionIsRequired() && !req.httpPayloadEncrypted) {
      throw new BadRequestException('Encrypted HTTP payload is required.');
    }

    next();
  }

  private decryptBody(req: Request): boolean {
    if (!this.httpCryptoService.isEncryptedPayload(req.body)) {
      return false;
    }

    req.body = this.httpCryptoService.decrypt<Record<string, unknown>>(
      req.body,
    );
    return true;
  }

  private decryptQuery(req: Request): boolean {
    const payload = req.query?.payload;
    const encryptedQuery = Array.isArray(payload) ? payload[0] : payload;

    if (typeof encryptedQuery !== 'string') {
      return false;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(encryptedQuery);
    } catch {
      throw new BadRequestException('Invalid encrypted query payload.');
    }

    if (!this.httpCryptoService.isEncryptedPayload(parsed)) {
      throw new BadRequestException('Invalid encrypted query payload.');
    }

    const decryptedQuery =
      this.httpCryptoService.decrypt<Record<string, unknown>>(parsed);

    if (
      !decryptedQuery ||
      typeof decryptedQuery !== 'object' ||
      Array.isArray(decryptedQuery)
    ) {
      throw new BadRequestException('Invalid encrypted query payload.');
    }

    (req as Request & { query: any }).query = decryptedQuery;
    return true;
  }

  private getHeader(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }

  private encryptionIsRequired(): boolean {
    return (
      this.configService.get<string>('HTTP_CRYPTO_REQUIRED')?.trim() === 'true'
    );
  }

  private isPublicDocumentationRoute(req: Request): boolean {
    const path = req.path ?? req.url;
    return ['/docs', '/docs-json', '/api/docs', '/api/docs-json'].includes(
      path,
    );
  }
}
