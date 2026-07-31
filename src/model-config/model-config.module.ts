import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelParameterVersion } from './entities/model-parameter-version.entity';
import { ModelConfigController } from './model-config.controller';
import { ModelConfigService } from './model-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModelParameterVersion])],
  controllers: [ModelConfigController],
  providers: [ModelConfigService],
  exports: [ModelConfigService],
})
export class ModelConfigModule {}
