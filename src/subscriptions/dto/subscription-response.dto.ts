import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  planId: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  currentPeriodStart: Date;

  @ApiProperty()
  currentPeriodEnd: Date;

  @ApiProperty()
  isTrial: boolean;

  @ApiProperty({ nullable: true })
  trialEndsAt: Date | null;

  @ApiProperty({ nullable: true })
  canceledAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}