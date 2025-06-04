import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PlanVisibility } from '../enums/plan-visibility.enum';

export const QueryPlansSchema = z.object({
  search: z.string().optional(),
  visibility: z.nativeEnum(PlanVisibility).optional(),
});

export class QueryPlansDto extends createZodDto(QueryPlansSchema) {}