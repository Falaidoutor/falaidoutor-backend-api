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
  httpCryptoResponseKey?: Buffer;
};

@Injectable()
export class HttpCryptoMiddleware implements NestMiddleware {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpCryptoService: HttpCryptoService,
  ) {}

  use(req: CryptoRequest, _res: Response, next: NextFunction): void {
    if (this.isCorsPreflight(req)) {
      return next();
    }

    if (this.isPublicDocumentationRoute(req)) {
      return next();
    }

    const encryptedHeader =
      this.getHeader(req, 'x-payload-encrypted') === 'true';
    const bodyWasEncrypted = this.decryptBody(req);
    const queryWasEncrypted = this.decryptQuery(req);

    req.httpPayloadEncrypted = bodyWasEncrypted || queryWasEncrypted;

    if (
      (encryptedHeader || this.encryptionIsRequired()) &&
      !req.httpPayloadEncrypted
    ) {
      throw new BadRequestException('Encrypted HTTP payload is required.');
    }

    next();
  }

  private decryptBody(req: CryptoRequest): boolean {
    if (!this.httpCryptoService.isEncryptedPayload(req.body)) {
      return false;
    }

    const decryptedPayload = this.httpCryptoService.decryptIncoming<
      Record<string, unknown>
    >(req.body);
    req.body = decryptedPayload.value;
    this.attachResponseKey(req, decryptedPayload.responseKey);

    return true;
  }

  private decryptQuery(req: CryptoRequest): boolean {
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

    const decryptedPayload =
      this.httpCryptoService.decryptIncoming<Record<string, unknown>>(parsed);
    const decryptedQuery = decryptedPayload.value;

    if (
      !decryptedQuery ||
      typeof decryptedQuery !== 'object' ||
      Array.isArray(decryptedQuery)
    ) {
      throw new BadRequestException('Invalid encrypted query payload.');
    }

    (req as Request & { query: any }).query = decryptedQuery;
    this.attachResponseKey(req, decryptedPayload.responseKey);

    return true;
  }

  private attachResponseKey(req: CryptoRequest, responseKey?: Buffer): void {
    if (responseKey) {
      req.httpCryptoResponseKey = responseKey;
    }
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

  private isCorsPreflight(req: Request): boolean {
    return req.method === 'OPTIONS';
  }
}
