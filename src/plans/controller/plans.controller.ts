import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import type { PlansService } from '../services/plans.service';
import { Role } from 'src/auth/enums/role.enum';
import { ZodValidationPipe } from 'nestjs-zod';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { PlanResponseDto } from '../dto/plan-response.dto';
import type { QueryPlansDto } from '../dto/query-plans.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import type { Plan } from '../entities/plan.entity';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiResponse({ type: PlanResponseDto })
  create(
    @Body(new ZodValidationPipe(CreatePlanDto.schema)) 
    createPlanDto: CreatePlanDto
  ): Promise<PlanResponseDto> {
    return this.plansService.create(createPlanDto)
      .then(this.toResponseDto);
  }

  @Get()
  @ApiResponse({ type: [PlanResponseDto] })
  findAll(@Query() query: QueryPlansDto): Promise<PlanResponseDto[]> {
    if (query.search) {
      return this.plansService.search(query.search.toString(), query.visibility)
        .then(plans => plans.map(this.toResponseDto));
    }
    return this.plansService.findAll()
      .then(plans => plans.map(this.toResponseDto));
  }

  @Get(':id')
  @ApiResponse({ type: PlanResponseDto })
  findOne(@Param('id') id: string): Promise<PlanResponseDto> {
    return this.plansService.findById(id)
      .then(this.toResponseDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiResponse({ type: PlanResponseDto })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePlanDto.schema)) 
    updatePlanDto: UpdatePlanDto,
  ): Promise<PlanResponseDto> {
    return this.plansService.update(id, updatePlanDto)
      .then(this.toResponseDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string): Promise<void> {
    return this.plansService.delete(id);
  }

  private toResponseDto(plan: Plan): PlanResponseDto {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      trialPeriodDays: plan.trialPeriodDays,
      visibility: plan.visibility,
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}