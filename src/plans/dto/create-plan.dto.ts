import { z } from 'zod';

export const CreatePlanSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  price: z.number().positive(),
  billingCycle: z.number().int().positive(),
  isActive: z.boolean().optional().default(true),
  stripePriceId: z.string().optional(),
});

export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;