import { 
  Injectable, 
  NotFoundException, 
  ConflictException,
  Logger,
  Inject,
  forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Plan } from '../../plans/entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
    @Inject(forwardRef(() => PlansService))
    private readonly plansService: PlansService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Cria uma nova assinatura
   */
  async create(user: User, createDto: CreateSubscriptionDto): Promise<Subscription> {
    // Verifica se o usuário já tem uma assinatura ativa
    const existingSubscription = await this.findActiveUserSubscription(user.id);
    if (existingSubscription) {
      throw new ConflictException('User already has an active subscription');
    }

    // Obtém o plano
    const plan = await this.plansService.findById(createDto.planId);
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    try {
      // Cria a assinatura no Stripe
      const stripeSubscription = await this.stripeService.createSubscription({
        customerId: user.stripeCustomerId,
        priceId: plan.stripePriceId,
        paymentMethodId: createDto.paymentMethodId,
        couponCode: createDto.couponCode,
        trialDays: plan.trialPeriodDays,
      });

      // Cria a assinatura no banco de dados
      const subscription = this.subscriptionRepository.create({
        user,
        plan,
        status: stripeSubscription.status as SubscriptionStatus,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: user.stripeCustomerId,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        isTrial: stripeSubscription.status === 'trialing',
        trialEndsAt: stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000) 
          : null,
      });

      const savedSubscription = await this.subscriptionRepository.save(subscription);

      // Dispara evento de assinatura criada
      this.eventEmitter.emit(
        'subscription.created',
        new SubscriptionCreatedEvent({
          subscriptionId: savedSubscription.id,
          userId: user.id,
          planId: plan.id,
          amount: plan.price,
          isTrial: savedSubscription.isTrial,
        })
      );

      return savedSubscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancela uma assinatura
   */
  async cancel(subscriptionId: string, userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, user: { id: userId } },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (![SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(subscription.status)) {
      throw new ConflictException('Only active or trialing subscriptions can be canceled');
    }

    try {
      // Cancela no Stripe
      await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);

      // Atualiza localmente
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
      const updatedSubscription = await this.subscriptionRepository.save(subscription);

      // Dispara evento de assinatura cancelada
      this.eventEmitter.emit(
        'subscription.cancelled',
        new SubscriptionCancelledEvent({
          subscriptionId: updatedSubscription.id,
          userId,
          planId: subscription.plan.id,
          cancelAtPeriodEnd: false,
        })
      );

      return updatedSubscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Muda o plano de uma assinatura
   */
  async changePlan(
    subscriptionId: string,
    userId: string,
    changePlanDto: ChangePlanDto,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, user: { id: userId } },
      relations: ['plan'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.plan.id === changePlanDto.newPlanId) {
      return subscription; // Nenhuma mudança necessária
    }

    const newPlan = await this.plansService.findById(changePlanDto.newPlanId);
    if (!newPlan) {
      throw new NotFoundException('New plan not found');
    }

    try {
      // Atualiza no Stripe
      const updatedStripeSubscription = await this.stripeService.changeSubscriptionPlan(
        subscription.stripeSubscriptionId,
        newPlan.stripePriceId,
        changePlanDto.prorate,
      );

      // Atualiza localmente
      subscription.plan = newPlan;
      subscription.currentPeriodStart = new Date(updatedStripeSubscription.current_period_start * 1000);
      subscription.currentPeriodEnd = new Date(updatedStripeSubscription.current_period_end * 1000);
      subscription.status = updatedStripeSubscription.status as SubscriptionStatus;

      return this.subscriptionRepository.save(subscription);
    } catch (error) {
      this.logger.error(`Failed to change subscription plan: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Encontra todas as assinaturas de um usuário
   */
  async findUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { user: { id: userId } },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Encontra a assinatura ativa de um usuário
   */
  async findActiveUserSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { 
        user: { id: userId },
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['plan'],
    });
  }

  /**
   * Processa webhooks do Stripe
   */
  async handleStripeWebhook(event: any): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object);
        break;
    }
  }

  /**
   * Atualiza uma assinatura baseada em evento do Stripe
   */
  private async handleSubscriptionUpdate(stripeSubscription: any): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
      relations: ['user', 'plan'],
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for Stripe ID: ${stripeSubscription.id}`);
      return;
    }

    // Atualiza os campos básicos
    subscription.status = stripeSubscription.status;
    subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    subscription.isTrial = stripeSubscription.status === 'trialing';
    subscription.trialEndsAt = stripeSubscription.trial_end 
      ? new Date(stripeSubscription.trial_end * 1000) 
      : null;

    // Trata cancelamento no final do período
    if (stripeSubscription.cancel_at_period_end) {
      subscription.canceledAt = new Date();
      this.eventEmitter.emit(
        'subscription.cancelled',
        new SubscriptionCancelledEvent({
          subscriptionId: subscription.id,
          userId: subscription.user.id,
          planId: subscription.plan.id,
          cancelAtPeriodEnd: true,
        })
      );
    }

    await this.subscriptionRepository.save(subscription);
  }

  /**
   * Processa pagamento bem-sucedido
   */
  private async handlePaymentSuccess(invoice: any): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: invoice.subscription },
      relations: ['user', 'plan'],
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for invoice: ${invoice.id}`);
      return;
    }

    // Cria registro de fatura
    const invoiceRecord = this.invoiceRepository.create({
      subscription,
      stripeInvoiceId: invoice.id,
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      pdfUrl: invoice.invoice_pdf,
      periodStart: new Date(invoice.period_start * 1000),
      periodEnd: new Date(invoice.period_end * 1000),
    });

    await this.invoiceRepository.save(invoiceRecord);

    // Atualiza dados do usuário se for o primeiro pagamento
    if (invoice.billing_reason === 'subscription_create') {
      await this.userService.update(subscription.user.id, {
        hasActiveSubscription: true,
      });
    }
  }

  /**
   * Processa falha no pagamento
   */
  private async handlePaymentFailure(invoice: any): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for failed invoice: ${invoice.id}`);
      return;
    }

    // Atualiza status da assinatura se necessário
    if (subscription.status === SubscriptionStatus.ACTIVE) {
      subscription.status = SubscriptionStatus.PAST_DUE;
      await this.subscriptionRepository.save(subscription);
    }

    // TODO: Enviar e-mail de notificação
  }

  /**
   * Processa assinatura deletada no Stripe
   */
  private async handleSubscriptionDeleted(stripeSubscription: any): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
      relations: ['user'],
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for deleted Stripe ID: ${stripeSubscription.id}`);
      return;
    }

    // Marca como cancelada se ainda não estiver
    if (subscription.status !== SubscriptionStatus.CANCELED) {
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.endedAt = new Date();
      await this.subscriptionRepository.save(subscription);
    }

    // Atualiza usuário
    await this.userService.update(subscription.user.id, {
      hasActiveSubscription: false,
    });
  }

  /**
   * Verifica se uma assinatura está ativa
   */
  async isSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await this.findActiveUserSubscription(userId);
    return !!subscription;
  }

  /**
   * Obtém o plano atual do usuário
   */
  async getUserCurrentPlan(userId: string): Promise<Plan | null> {
    const subscription = await this.findActiveUserSubscription(userId);
    return subscription?.plan || null;
  }

  /**
   * Obtém todas as assinaturas que expiram em breve
   */
  async getSubscriptionsExpiringSoon(days: number = 7): Promise<Subscription[]> {
    const date = new Date();
    date.setDate(date.getDate() + days);

    return this.subscriptionRepository.find({
      where: {
        currentPeriodEnd: Between(new Date(), date),
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['user', 'plan'],
    });
  }
}