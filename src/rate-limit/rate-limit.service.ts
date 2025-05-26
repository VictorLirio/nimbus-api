import { Injectable } from '@nestjs/common';
import { CreateRateLimitDto } from './dto/create-rate-limit.dto';
import { UpdateRateLimitDto } from './dto/update-rate-limit.dto';

@Injectable()
export class RateLimitService {
  create(createRateLimitDto: CreateRateLimitDto) {
    return 'This action adds a new rateLimit';
  }

  findAll() {
    return `This action returns all rateLimit`;
  }

  findOne(id: number) {
    return `This action returns a #${id} rateLimit`;
  }

  update(id: number, updateRateLimitDto: UpdateRateLimitDto) {
    return `This action updates a #${id} rateLimit`;
  }

  remove(id: number) {
    return `This action removes a #${id} rateLimit`;
  }
}
