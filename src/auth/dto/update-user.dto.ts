import { RegisterSchema } from "./register.dto";

export const UpdateUserSchema = RegisterSchema.partial();

export class UpdateUserDto {
  email?: string;
  password?: string;
  role?: string;
}