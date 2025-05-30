import { z } from 'zod';
import { Role } from '../enums/role.enum';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
  ),
  role: z.nativeEnum(Role).optional().default(Role.USER),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;