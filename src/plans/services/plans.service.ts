import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Plan } from '../entities/plan.entity';
import { PlanVisibility } from '../enums/plan-visibility.enum';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { PlanEvent } from '../events/plan-created.event';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { PlansRepository } from '../repositories/plans.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(PlansRepository)
    private readonly plansRepository: PlansRepository,
    private readonly stripeService: StripeService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(): Promise<Plan[]> {
    return this.plansRepository.findActivePlans();
  }

  async findById(id: string): Promise<Plan> {
    const plan = await this.plansRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async create(createPlanDto: CreatePlanDto): Promise<Plan> {
    // Verifica se já existe um plano com o mesmo nome
    const existingPlan = await this.plansRepository.findOne({ 
      where: { name: createPlanDto.name } 
    });
    
    if (existingPlan) {
      throw new ConflictException('Plan with this name already exists');
    }

    // Cria o produto no Stripe
    const stripeProduct = await this.stripeService.createProduct({
      name: createPlanDto.name,
      description: createPlanDto.description,
    });

    // Cria o preço no Stripe
    const stripePrice = await this.stripeService.createPrice({
      productId: stripeProduct.id,
      unitAmount: Math.round(createPlanDto.price * 100), // converte para centavos
      currency: 'usd',
      billingCycle: createPlanDto.billingCycle,
    });

    // Salva no banco de dados
    const plan = await this.plansRepository.createPlan({
      ...createPlanDto,
      stripeProductId: stripeProduct.id,
      stripePriceId: stripePrice.id,
    });

    // Dispara evento
    this.eventEmitter.emit(
      'plan.created',
      new PlanEvent({
        planId: plan.id,
        name: plan.name,
        price: plan.price,
      })
    );

    return plan;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findById(id);

    // Atualiza no Stripe se o preço mudar
    if (updatePlanDto.price && updatePlanDto.price !== plan.price) {
      const newPrice = await this.stripeService.createPrice({
        productId: plan.stripeProductId,
        unitAmount: Math.round(updatePlanDto.price * 100),
        currency: 'usd',
        billingCycle: plan.billingCycle,
      });

      updatePlanDto.stripePriceId = newPrice.id;
    }

    // Atualiza o produto no Stripe se o nome ou descrição mudar
    if (updatePlanDto.name || updatePlanDto.description) {
      await this.stripeService.updateProduct(plan.stripeProductId, {
        name: updatePlanDto.name,
        description: updatePlanDto.description,
      });
    }

    const updatedPlan = await this.plansRepository.updatePlan(id, updatePlanDto);

    if (!updatedPlan) {
      throw new NotFoundException('Plan not found');
    }
    // Dispara evento
    this.eventEmitter.emit(
      'plan.updated',
      new PlanEvent({
        planId: updatedPlan.id,
        name: updatedPlan.name,
        price: updatedPlan.price,
      })
    );

    return updatedPlan;
  }

  async delete(id: string): Promise<void> {
    const plan = await this.findById(id);

    // Desativa no Stripe
    await this.stripeService.updateProduct(plan.stripeProductId, {
      active: false,
    });

    // Marca como inativo no banco de dados
    await this.plansRepository.update(id, { isActive: false });
  }

  async search(query: string, visibility?: string): Promise<Plan[]> {
    return this.plansRepository.searchPlans(
      query, 
      visibility as PlanVisibility
    );
  }
}