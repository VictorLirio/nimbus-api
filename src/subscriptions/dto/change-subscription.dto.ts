import { z } from 'zod';

export const ChangePlanSchema = z.object({
  newPlanId: z.string().uuid(),
  prorate: z.boolean().optional().default(true),
});

export type ChangePlanDto = z.infer<typeof ChangePlanSchema>;