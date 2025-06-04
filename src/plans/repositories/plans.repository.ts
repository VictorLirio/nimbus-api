import { EntityRepository, Repository } from 'typeorm';
import { Plan } from '../entities/plan.entity';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import type { PlanVisibility } from '../enums/plan-visibility.enum';

@EntityRepository(Plan)
export class PlansRepository extends Repository<Plan> {
  async findActivePlans(): Promise<Plan[]> {
    return this.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async findById(id: string): Promise<Plan | null> {
    return this.findOne({ where: { id } });
  }

  async createPlan(createPlanDto: CreatePlanDto): Promise<Plan> {
    const plan = this.create(createPlanDto);
    return this.save(plan);
  }

  async updatePlan(id: string, updatePlanDto: UpdatePlanDto): Promise<Plan | null >{
    await this.update(id, updatePlanDto);
    return this.findById(id);
  }

  async searchPlans(query: string, visibility?: PlanVisibility): Promise<Plan[]> {
    const qb = this.createQueryBuilder('plan')
      .where('LOWER(plan.name) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(plan.description) LIKE LOWER(:query)', { query: `%${query}%` });

    if (visibility) {
      qb.andWhere('plan.visibility = :visibility', { visibility });
    }

    return qb.getMany();
  }
}