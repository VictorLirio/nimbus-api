import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { PlanBillingCycle, PlanVisibility } from '../enums/plan-visibility.enum';

@Entity()
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ 
    type: 'enum',
    enum: PlanBillingCycle,
    default: PlanBillingCycle.MONTHLY
  })
  billingCycle: PlanBillingCycle;

  @Column({ default: 0 })
  trialPeriodDays: number;

  @Column({ 
    type: 'enum',
    enum: PlanVisibility,
    default: PlanVisibility.PUBLIC
  })
  visibility: PlanVisibility;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  stripePriceId?: string;

  @Column({ nullable: true })
  stripeProductId?: string;

  @OneToMany(() => Subscription, subscription => subscription.plan)
  subscriptions: Subscription[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}