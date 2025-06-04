import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from './entities/plan.entity';
import { BillingModule } from '../billing/billing.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PlansController } from './controller/plans.controller';
import { PlansService } from './services/plans.service';
import { PlansRepository } from './repositories/plans.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, PlansRepository]),
    BillingModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}