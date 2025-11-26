import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  UpdateOrderStatusDto,
  CancelOrderDto,
} from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Role, OrderStatus } from '../common/enums';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ============================================
  // Client Endpoints
  // ============================================

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Create new order from cart (Client only)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cart is empty or validation error',
  })
  create(@Body() createDto: CreateOrderDto, @CurrentUser() user: User) {
    return this.ordersService.create(createDto, user);
  }

  @Get('my-orders')
  @UseGuards(RolesGuard)
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Get my orders (Client only)' })
  @ApiResponse({ status: 200, description: 'Returns list of client orders' })
  getMyOrders(@CurrentUser() user: User) {
    return this.ordersService.findByClient(user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel order (only PENDING/CONFIRMED status)' })
  @ApiResponse({ status: 200, description: 'Order cancelled, stock restored' })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel order in current status',
  })
  cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelDto: CancelOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.cancelOrder(id, cancelDto, user);
  }

  // ============================================
  // Admin Endpoints
  // ============================================

  @Get('admin-orders')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get orders for my admin account' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiResponse({ status: 200, description: 'Returns admin orders' })
  getAdminOrders(
    @CurrentUser() user: User,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.findByAdmin(user.id, status);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateOrderStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(id, updateDto, user);
  }

  @Get('admin-stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get order statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns order counts and revenue' })
  getAdminStats(@CurrentUser() user: User) {
    return this.ordersService.getAdminStats(user.id);
  }

  // ============================================
  // Shared Endpoints
  // ============================================

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Returns order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @Get('by-number/:orderNumber')
  @ApiOperation({
    summary: 'Get order by order number (e.g., ORD-20241125-001)',
  })
  @ApiResponse({ status: 200, description: 'Returns order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }
}
