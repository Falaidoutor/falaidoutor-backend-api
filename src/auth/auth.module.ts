import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../shared/entities/patient.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
