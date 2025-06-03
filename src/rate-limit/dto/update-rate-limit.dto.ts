import { PartialType } from '@nestjs/mapped-types';
import { CreateRateLimitDto } from './create-rate-limit.dto';

export class UpdateRateLimitDto extends PartialType(CreateRateLimitDto) {}
