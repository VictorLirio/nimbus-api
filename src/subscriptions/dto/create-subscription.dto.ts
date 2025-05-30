import { z } from 'zod';

export const CreateSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  paymentMethodId: z.string().optional(),
  couponCode: z.string().optional(),
});

export type CreateSubscriptionDto = z.infer<typeof CreateSubscriptionSchema>;