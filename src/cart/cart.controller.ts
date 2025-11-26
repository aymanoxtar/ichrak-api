import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums';

@ApiTags('Cart')
@ApiBearerAuth('JWT-auth')
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLIENT)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get my cart with items grouped by admin' })
  @ApiResponse({ status: 200, description: 'Returns cart with summary' })
  getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user);
  }

  @Post('add')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiResponse({ status: 400, description: 'Not enough stock' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  addToCart(@Body() addDto: AddToCartDto, @CurrentUser() user: User) {
    return this.cartService.addToCart(addDto, user);
  }

  @Patch('item/:adminProductId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Quantity updated' })
  @ApiResponse({ status: 404, description: 'Item not in cart' })
  updateCartItem(
    @Param('adminProductId', ParseUUIDPipe) adminProductId: string,
    @Body() updateDto: UpdateCartItemDto,
    @CurrentUser() user: User,
  ) {
    return this.cartService.updateCartItem(adminProductId, updateDto, user);
  }

  @Delete('item/:adminProductId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  @ApiResponse({ status: 404, description: 'Item not in cart' })
  removeFromCart(
    @Param('adminProductId', ParseUUIDPipe) adminProductId: string,
    @CurrentUser() user: User,
  ) {
    return this.cartService.removeFromCart(adminProductId, user);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  clearCart(@CurrentUser() user: User) {
    return this.cartService.clearCart(user);
  }

  @Get('delivery-options')
  @ApiOperation({
    summary: 'Calculate delivery options per admin + self-pickup option',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns delivery options and self-pickup option',
  })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  calculateDeliveryOptions(@CurrentUser() user: User) {
    return this.cartService.calculateDeliveryOptions(user);
  }
}
