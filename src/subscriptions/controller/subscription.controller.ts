import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Patch,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SubscriptionResponseDto } from '../dto/subscription-response.dto';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChangePlanDto } from '../dto/change-subscription.dto';
import { SubscriptionsService } from '../services/subscriptions.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from 'src/auth/enums/role.enum';
import type { Subscription } from '../entities/subscription.entity';


@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(Role.USER)
  @ApiResponse({ type: SubscriptionResponseDto })
  async create(
    @Req() req,
    @Body() createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsService.create(
      req.user,
      createSubscriptionDto,
    );

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return this.toResponseDto(subscription);
  }

  @Get()
  @Roles(Role.USER)
  @ApiResponse({ type: [SubscriptionResponseDto] })
  async findAll(@Req() req): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.subscriptionsService.findUserSubscriptions(
      req.user.id,
    );
    return subscriptions.map(this.toResponseDto);
  }

  @Get(':id')
  @Roles(Role.USER)
  @ApiResponse({ type: SubscriptionResponseDto })
  async findOne(
    @Req() req,
    @Param('id') id: string,
  ): Promise<SubscriptionResponseDto> {
    const subscriptions = await this.subscriptionsService.findUserSubscriptions(
      req.user.id,
    );
    const subscription = subscriptions.find((sub) => sub.id === id);
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return this.toResponseDto(subscription);
  }

  @Delete(':id/cancel')
  @Roles(Role.USER)
  @ApiResponse({ type: SubscriptionResponseDto })
  async cancel(
    @Req() req,
    @Param('id') id: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsService.cancel(id, req.user.id);
    return this.toResponseDto(subscription);
  }

  @Patch(':id/change-plan')
  @Roles(Role.USER)
  @ApiResponse({ type: SubscriptionResponseDto })
  async changePlan(
    @Req() req,
    @Param('id') id: string,
    @Body() changePlanDto: ChangePlanDto,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionsService.changePlan(
      id,
      req.user.id,
      changePlanDto,
    );
    return this.toResponseDto(subscription);
  }

  private toResponseDto(subscription: Subscription): SubscriptionResponseDto {
    return {
      id: subscription.id,
      planId: subscription.plan.id,
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      isTrial: subscription.isTrial,
      trialEndsAt: subscription.trialEndsAt,
      canceledAt: subscription.canceledAt,
      createdAt: subscription.createdAt,
    };
  }
}