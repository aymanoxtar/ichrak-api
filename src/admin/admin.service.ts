import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus } from '../common/enums';

// Type definitions for raw query results
interface EarningsResult {
  totalEarnings: string | null;
}

interface PendingResult {
  pendingEarnings: string | null;
}

interface CommissionsResult {
  totalLevel1: string | null;
  totalLevel2: string | null;
  totalSuperAdmin: string | null;
  totalCommissions: string | null;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  /**
   * Get referral system statistics for Super Admin
   * - Total earnings (10% from all orders)
   * - Total users with referral codes
   * - Total referrals made
   * - Top referrers
   */
  async getReferralStats() {
    // Total Super Admin earnings (10% from all delivered orders)
    const earningsResult: EarningsResult | undefined =
      await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.superAdminCommission)', 'totalEarnings')
        .where('order.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('order.commissionsDistributed = :distributed', {
          distributed: true,
        })
        .getRawOne();

    // Pending earnings (orders not yet delivered)
    const pendingResult: PendingResult | undefined = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.superAdminCommission)', 'pendingEarnings')
      .where('order.status != :status', { status: OrderStatus.DELIVERED })
      .andWhere('order.status != :cancelled', { status: OrderStatus.CANCELLED })
      .getRawOne();

    const totalUsers = await this.userRepository.count();

    // Total referrals made (users who were referred)
    const totalReferrals = await this.userRepository
      .createQueryBuilder('user')
      .where('user.referredById IS NOT NULL')
      .getCount();

    // Top 10 referrers
    const topReferrers = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.referralCode',
        'user.referralCount',
        'user.referralEarnings',
      ])
      .where('user.referralCount > 0')
      .orderBy('user.referralCount', 'DESC')
      .limit(10)
      .getMany();

    // Total commissions distributed
    const commissionsResult: CommissionsResult | undefined =
      await this.orderRepository
        .createQueryBuilder('order')
        .select([
          'SUM(order.level1Commission) as totalLevel1',
          'SUM(order.level2Commission) as totalLevel2',
          'SUM(order.superAdminCommission) as totalSuperAdmin',
          'SUM(order.totalCommission) as totalCommissions',
        ])
        .where('order.commissionsDistributed = :distributed', {
          distributed: true,
        })
        .getRawOne();

    // Orders with referral commissions
    const ordersWithReferral = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.level1ReferrerId IS NOT NULL')
      .getCount();

    return {
      superAdminEarnings: {
        total: parseFloat(earningsResult?.totalEarnings || '0'),
        pending: parseFloat(pendingResult?.pendingEarnings || '0'),
      },
      users: {
        total: totalUsers,
        withReferralCode: totalUsers, // All users have referral codes now
        referred: totalReferrals,
      },
      commissions: {
        totalDistributed: parseFloat(
          commissionsResult?.totalCommissions || '0',
        ),
        level1Total: parseFloat(commissionsResult?.totalLevel1 || '0'),
        level2Total: parseFloat(commissionsResult?.totalLevel2 || '0'),
        superAdminTotal: parseFloat(commissionsResult?.totalSuperAdmin || '0'),
      },
      ordersWithReferral,
      topReferrers: topReferrers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        referralCode: u.referralCode,
        referralCount: u.referralCount,
        totalEarnings: u.referralEarnings,
      })),
    };
  }

  /**
   * Get all users with their referral information
   */
  async getReferralUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.referredBy', 'referrer')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.role',
        'user.referralCode',
        'user.referralCount',
        'user.referralEarnings',
        'user.referredById',
        'user.createdAt',
        'referrer.id',
        'referrer.firstName',
        'referrer.lastName',
        'referrer.email',
        'referrer.referralCode',
      ])
      .orderBy('user.referralCount', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        referralCode: u.referralCode,
        referralCount: u.referralCount,
        referralEarnings: u.referralEarnings,
        referredBy: u.referredBy
          ? {
              id: u.referredBy.id,
              name: `${u.referredBy.firstName} ${u.referredBy.lastName}`,
              referralCode: u.referredBy.referralCode,
            }
          : null,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get referral commissions history from orders
   */
  async getReferralCommissions(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.level1Referrer', 'level1')
      .leftJoinAndSelect('order.level2Referrer', 'level2')
      .where('order.totalCommission > 0')
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: orders.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        orderStatus: o.status,
        orderTotal: o.total,
        totalCommission: o.totalCommission,
        commissions: {
          level1: {
            amount: o.level1Commission,
            referrer: o.level1Referrer
              ? {
                  id: o.level1Referrer.id,
                  name: `${o.level1Referrer.firstName} ${o.level1Referrer.lastName}`,
                  email: o.level1Referrer.email,
                }
              : null,
          },
          level2: {
            amount: o.level2Commission,
            referrer: o.level2Referrer
              ? {
                  id: o.level2Referrer.id,
                  name: `${o.level2Referrer.firstName} ${o.level2Referrer.lastName}`,
                  email: o.level2Referrer.email,
                }
              : null,
          },
          superAdmin: {
            amount: o.superAdminCommission,
          },
        },
        distributed: o.commissionsDistributed,
        client: o.client
          ? {
              id: o.client.id,
              name: `${o.client.firstName} ${o.client.lastName}`,
              email: o.client.email,
            }
          : null,
        createdAt: o.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed earnings for a specific user
   */
  async getUserReferralDetails(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['referredBy'],
    });

    if (!user) {
      return null;
    }

    // Get users referred by this user
    const referredUsers = await this.userRepository.find({
      where: { referredById: userId },
      select: ['id', 'firstName', 'lastName', 'email', 'createdAt'],
    });

    // Get orders where this user earned commission (as level1 or level2)
    const level1Orders = await this.orderRepository.find({
      where: { level1ReferrerId: userId, commissionsDistributed: true },
      select: [
        'id',
        'orderNumber',
        'level1Commission',
        'total',
        'createdAt',
        'status',
      ],
    });

    const level2Orders = await this.orderRepository.find({
      where: { level2ReferrerId: userId, commissionsDistributed: true },
      select: [
        'id',
        'orderNumber',
        'level2Commission',
        'total',
        'createdAt',
        'status',
      ],
    });

    return {
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        referralCode: user.referralCode,
        referralCount: user.referralCount,
        totalEarnings: user.referralEarnings,
        referredBy: user.referredBy
          ? {
              id: user.referredBy.id,
              name: `${user.referredBy.firstName} ${user.referredBy.lastName}`,
            }
          : null,
      },
      referredUsers: referredUsers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        joinedAt: u.createdAt,
      })),
      earningsHistory: {
        level1: level1Orders.map((o) => ({
          orderId: o.id,
          orderNumber: o.orderNumber,
          commission: o.level1Commission,
          orderTotal: o.total,
          date: o.createdAt,
        })),
        level2: level2Orders.map((o) => ({
          orderId: o.id,
          orderNumber: o.orderNumber,
          commission: o.level2Commission,
          orderTotal: o.total,
          date: o.createdAt,
        })),
      },
    };
  }
}
