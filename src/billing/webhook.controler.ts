import { Body, Controller, Post } from "@nestjs/common";
import type { StripeService } from "./stripe.service";


@Controller("webhook")
export class WebhookController {
  private readonly stripeService: StripeService;

  @Post()
  async handleStrpeEvent(
    @Body() body: any,
  ): Promise<void> {
    return this.stripeService.handleStripeEvent(body);
  }
}