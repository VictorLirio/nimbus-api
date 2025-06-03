import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [AuthModule, BillingModule, PlansModule, SubscriptionsModule, RateLimitModule],
})
export class AppModule {}
