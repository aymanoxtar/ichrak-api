import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderItem } from './entities';
import { AdminProduct } from '../admin-products/entities/admin-product.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  UpdateOrderStatusDto,
  CancelOrderDto,
} from './dto/update-order-status.dto';
import { OrderStatus, Role } from '../common/enums';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(AdminProduct)
    private adminProductRepository: Repository<AdminProduct>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Generate order number: ORD-YYYYMMDD-XXX
  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const count = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt BETWEEN :start AND :end', {
        start: todayStart,
        end: todayEnd,
      })
      .getCount();

    const orderNum = String(count + 1).padStart(3, '0');
    return `ORD-${dateStr}-${orderNum}`;
  }

  // Client creates order
  async create(createDto: CreateOrderDto, client: User): Promise<Order> {
    // Verify admin exists
    const admin = await this.userRepository.findOne({
      where: { id: createDto.adminId, role: Role.ADMIN },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Validate and get products
    let subtotal = 0;
    let totalCommission = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const item of createDto.items) {
      const adminProduct = await this.adminProductRepository.findOne({
        where: {
          id: item.adminProductId,
          adminId: createDto.adminId,
          isAvailable: true,
        },
        relations: ['globalProduct'],
      });

      if (!adminProduct) {
        throw new NotFoundException(
          `Product ${item.adminProductId} not found or not available`,
        );
      }

      if (adminProduct.quantity < item.quantity) {
        throw new BadRequestException(
          `Not enough stock for ${adminProduct.globalProduct.nameFr}. Available: ${adminProduct.quantity}`,
        );
      }

      const itemTotal = Number(adminProduct.price) * item.quantity;
      const itemCommission = Number(adminProduct.commission) * item.quantity;

      subtotal += itemTotal;
      totalCommission += itemCommission;

      orderItems.push({
        adminProductId: adminProduct.id,
        globalProductId: adminProduct.globalProductId,
        productNameFr: adminProduct.globalProduct.nameFr,
        productNameAr: adminProduct.globalProduct.nameAr,
        productImage: adminProduct.globalProduct.images?.[0] || undefined,
        unitPrice: adminProduct.price,
        quantity: item.quantity,
        totalPrice: itemTotal,
        commission: itemCommission,
      });
    }

    // Calculate delivery fee (based on city)
    const firstProduct = await this.adminProductRepository.findOne({
      where: { id: createDto.items[0].adminProductId },
    });

    const isSameCity =
      admin.city?.toLowerCase() === createDto.deliveryCity.toLowerCase();
    const deliveryFee = isSameCity
      ? Number(firstProduct?.livraisonMemeVille || 0)
      : Number(firstProduct?.livraisonGeneral || 0);

    const total = subtotal + deliveryFee;

    // Create order
    const orderNumber = await this.generateOrderNumber();

    const order = this.orderRepository.create({
      orderNumber,
      clientId: client.id,
      adminId: createDto.adminId,
      subtotal,
      deliveryFee,
      total,
      totalCommission,
      promoCodeId: createDto.promoCodeId || null,
      deliveryAddress: createDto.deliveryAddress,
      deliveryCity: createDto.deliveryCity,
      deliveryPhone: createDto.deliveryPhone || client.phone,
      clientLatitude: createDto.clientLatitude,
      clientLongitude: createDto.clientLongitude,
      clientNotes: createDto.clientNotes,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Create order items
    for (const item of orderItems) {
      const orderItem = this.orderItemRepository.create({
        ...item,
        orderId: savedOrder.id,
      });
      await this.orderItemRepository.save(orderItem);
    }

    // Update product quantities
    for (const item of createDto.items) {
      await this.adminProductRepository.decrement(
        { id: item.adminProductId },
        'quantity',
        item.quantity,
      );
    }

    return this.findOne(savedOrder.id);
  }

  // Get order by ID
  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        'client',
        'admin',
        'items',
        'items.adminProduct',
        'items.globalProduct',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // Get order by order number
  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: [
        'client',
        'admin',
        'items',
        'items.adminProduct',
        'items.globalProduct',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // Get client's orders
  async findByClient(clientId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { clientId },
      relations: ['admin', 'items', 'items.globalProduct'],
      order: { createdAt: 'DESC' },
    });
  }

  // Get admin's orders
  async findByAdmin(adminId: string, status?: OrderStatus): Promise<Order[]> {
    const where: { adminId: string; status?: OrderStatus } = { adminId };
    if (status) {
      where.status = status;
    }

    return this.orderRepository.find({
      where,
      relations: ['client', 'items', 'items.globalProduct'],
      order: { createdAt: 'DESC' },
    });
  }

  // Admin updates order status
  async updateStatus(
    id: string,
    updateDto: UpdateOrderStatusDto,
    admin: User,
  ): Promise<Order> {
    const order = await this.findOne(id);

    if (order.adminId !== admin.id && admin.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Not authorized to update this order');
    }

    // Validate status transition
    this.validateStatusTransition(order.status, updateDto.status);

    order.status = updateDto.status;

    if (updateDto.adminNotes) {
      order.adminNotes = updateDto.adminNotes;
    }

    // Update timestamps
    const now = new Date();
    switch (updateDto.status) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = now;
        break;
      case OrderStatus.SHIPPED:
        order.shippedAt = now;
        break;
      case OrderStatus.DELIVERED:
        order.deliveredAt = now;
        // Update sold count
        for (const item of order.items) {
          await this.adminProductRepository.increment(
            { id: item.adminProductId },
            'soldCount',
            item.quantity,
          );
        }
        break;
    }

    return this.orderRepository.save(order);
  }

  // Cancel order
  async cancelOrder(
    id: string,
    cancelDto: CancelOrderDto,
    user: User,
  ): Promise<Order> {
    const order = await this.findOne(id);

    // Check if user can cancel
    const isClient = order.clientId === user.id;
    const isAdmin = order.adminId === user.id;
    const isSuperAdmin = user.role === Role.SUPER_ADMIN;

    if (!isClient && !isAdmin && !isSuperAdmin) {
      throw new ForbiddenException('Not authorized to cancel this order');
    }

    // Can only cancel PENDING or CONFIRMED orders
    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.CONFIRMED
    ) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = cancelDto.cancelReason;
    order.cancelledBy = isClient ? 'CLIENT' : 'ADMIN';
    order.cancelledAt = new Date();

    // Restore product quantities
    for (const item of order.items) {
      await this.adminProductRepository.increment(
        { id: item.adminProductId },
        'quantity',
        item.quantity,
      );
    }

    return this.orderRepository.save(order);
  }

  // Validate status transitions
  private validateStatusTransition(
    current: OrderStatus,
    next: OrderStatus,
  ): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition from ${current} to ${next}`,
      );
    }
  }

  // Get order statistics for admin
  async getAdminStats(adminId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    totalCommission: number;
  }> {
    const orders = await this.orderRepository.find({
      where: { adminId },
    });

    const pendingOrders = orders.filter(
      (o) =>
        o.status === OrderStatus.PENDING ||
        o.status === OrderStatus.CONFIRMED ||
        o.status === OrderStatus.PREPARING ||
        o.status === OrderStatus.SHIPPED,
    ).length;

    const completedOrders = orders.filter(
      (o) => o.status === OrderStatus.DELIVERED,
    );

    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + Number(o.total),
      0,
    );

    const totalCommission = completedOrders.reduce(
      (sum, o) => sum + Number(o.totalCommission),
      0,
    );

    return {
      totalOrders: orders.length,
      pendingOrders,
      completedOrders: completedOrders.length,
      totalRevenue,
      totalCommission,
    };
  }
}
