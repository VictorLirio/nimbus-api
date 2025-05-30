import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { PlansModule } from '../plans/plans.module';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionsController } from './controller/subscription.controller';
import { SubscriptionRepository } from './repositories/subscription.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, SubscriptionRepository]),
    PlansModule,
    BillingModule,
    AuthModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}