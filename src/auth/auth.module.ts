import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueTriage } from '../shared/entities/queue-triage.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([QueueTriage])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
