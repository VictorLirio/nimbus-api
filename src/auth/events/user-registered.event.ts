export class UserRegisteredEvent {
  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      verificationToken: string;
    },
  ) {}
}