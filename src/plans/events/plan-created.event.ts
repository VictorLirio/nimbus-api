export class PlanEvent {
  constructor(
    public readonly payload: {
      planId: string;
      name: string;
      price: number;
    },
  ) {}
}