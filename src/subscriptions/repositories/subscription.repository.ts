import { EntityRepository, Repository } from 'typeorm';
import { Subscription } from '../entities/subscription.entity';
import { User } from '../../auth/entities/user.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@EntityRepository(Subscription)
export class SubscriptionRepository extends Repository<Subscription> {
  async findActiveSubscription(userId: string): Promise<Subscription | null> {
    return this.createQueryBuilder('subscription')
      .where('subscription.userId = :userId', { userId })
      .andWhere('subscription.status = :status', { status: 'active' })
      .getOne();
  }

  async findUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.find({
      where: { user: { id: userId } },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.findOne({
      where: { id: subscriptionId },
    });
    if (!subscription) {
      throw new Error('Subscription not found');
    }
  
    subscription.status = SubscriptionStatus.CANCELED;
    subscription.canceledAt = new Date();
    return this.save(subscription);
  }
}