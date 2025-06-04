import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PlanBillingCycle, PlanVisibility } from '../enums/plan-visibility.enum';

export const CreatePlanSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  price: z.number().positive(),
  billingCycle: z.nativeEnum(PlanBillingCycle),
  stripeProductId: z.string(),
  stripePriceId: z.string(),
  trialPeriodDays: z.number().int().min(0).max(365).default(0),
  visibility: z.nativeEnum(PlanVisibility).default(PlanVisibility.PUBLIC),
  isActive: z.boolean().default(true),
});

export class CreatePlanDto extends createZodDto(CreatePlanSchema) {
  static schema = CreatePlanSchema;
}