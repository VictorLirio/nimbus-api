import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CreatePlanDto } from './create-plan.dto';

export const UpdatePlanSchema = CreatePlanDto.schema.partial();

export class UpdatePlanDto extends createZodDto(UpdatePlanSchema) {
  static schema = UpdatePlanSchema;
}