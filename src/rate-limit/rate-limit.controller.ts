import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { CreateRateLimitDto } from './dto/create-rate-limit.dto';
import { UpdateRateLimitDto } from './dto/update-rate-limit.dto';

@Controller('rate-limit')
export class RateLimitController {
  constructor(private readonly rateLimitService: RateLimitService) {}

  @Post()
  create(@Body() createRateLimitDto: CreateRateLimitDto) {
    return this.rateLimitService.create(createRateLimitDto);
  }

  @Get()
  findAll() {
    return this.rateLimitService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rateLimitService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRateLimitDto: UpdateRateLimitDto) {
    return this.rateLimitService.update(+id, updateRateLimitDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rateLimitService.remove(+id);
  }
}
