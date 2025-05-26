import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [],
  controllers: [],
  providers: [StripeService, ConfigService],
  exports: [StripeService],
})
export class BillingModule {}
