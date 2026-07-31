import { Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';
import { UpdateModelConfigDto } from './dto/update-model-config.dto';
import { ModelConfigService } from './model-config.service';

@Controller('model-config')
export class ModelConfigController {
  constructor(private readonly service: ModelConfigService) {}

  @Get()
  getLatest() {
    return this.service.getLatest();
  }

  @Post('versions')
  createVersion(@Body(ValidationPipe) dto: UpdateModelConfigDto) {
    return this.service.createVersion(dto);
  }
}
