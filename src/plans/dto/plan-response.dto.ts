import { ApiProperty } from '@nestjs/swagger';
import { PlanBillingCycle, PlanVisibility } from '../enums/plan-visibility.enum';

export class PlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiProperty({ enum: PlanBillingCycle })
  billingCycle: PlanBillingCycle;

  @ApiProperty()
  trialPeriodDays: number;

  @ApiProperty({ enum: PlanVisibility })
  visibility: PlanVisibility;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}