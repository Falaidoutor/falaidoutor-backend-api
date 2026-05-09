import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { HttpCryptoService } from '../crypto/http-crypto.service';
import { CryptoRequest } from '../middleware/http-crypto.middleware';

@Injectable()
export class HttpCryptoInterceptor implements NestInterceptor {
  constructor(private readonly httpCryptoService: HttpCryptoService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<CryptoRequest>();

    if (!request.httpPayloadEncrypted) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (data === undefined) {
          return data;
        }

        return request.httpCryptoResponseKey
          ? this.httpCryptoService.encryptWithSessionKey(
              data,
              request.httpCryptoResponseKey,
            )
          : this.httpCryptoService.encrypt(data);
      }),
    );
  }
}
