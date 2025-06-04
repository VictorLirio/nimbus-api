export class PasswordResetRequestedEvent {
  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      resetToken: string;
    },
  ) {}
}