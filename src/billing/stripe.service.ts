import { Injectable } from "@nestjs/common";
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-04-30.basil",
    });
  }
  async createCheckoutSession(
    priceId: string,
    customerEmail: string,
  ): Promise<string> {
    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL ?? ''}/billing/success`,
      cancel_url: `${process.env.FRONTEND_URL ?? ''}/billing/cancel`,
    });
    return session.url!;
  }

  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session completed: ${session.id}`);
        break;
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Invoice payment succeeded: ${invoice.id}`);
        break;
      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }
  }
}