import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { PrototypeOnlyGuard } from '../../common/guards/prototype-only.guard';
import { CallsService } from './calls.service';

@Controller('calls')
@UseGuards(PrototypeOnlyGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  async findAll() {
    return this.callsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const call = await this.callsService.findOne(id);
    if (!call) {
      throw new NotFoundException('Call not found');
    }
    return call;
  }
}
