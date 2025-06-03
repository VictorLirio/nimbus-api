import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export class LoginDto implements z.infer<typeof LoginSchema> {
  email: string;
  password: string;

  constructor(data: z.infer<typeof LoginSchema>) {
    Object.assign(this, data);
  }
}