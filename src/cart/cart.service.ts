import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem } from './entities';
import { AdminProduct } from '../admin-products/entities/admin-product.entity';
import { User } from '../users/entities/user.entity';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(AdminProduct)
    private adminProductRepository: Repository<AdminProduct>,
  ) {}

  // Get or create cart for client
  private async getOrCreateCart(clientId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { clientId },
      relations: [
        'items',
        'items.adminProduct',
        'items.adminProduct.globalProduct',
        'items.adminProduct.admin',
      ],
    });

    if (!cart) {
      cart = this.cartRepository.create({ clientId });
      cart = await this.cartRepository.save(cart);
      cart.items = [];
    }

    return cart;
  }

  // Get client's cart
  async getCart(client: User): Promise<{
    cart: Cart;
    summary: {
      itemCount: number;
      subtotal: number;
      adminGroups: {
        adminId: string;
        adminName: string;
        items: CartItem[];
        subtotal: number;
      }[];
    };
  }> {
    const cart = await this.getOrCreateCart(client.id);

    // Group items by admin
    const adminGroups: Map<
      string,
      {
        adminId: string;
        adminName: string;
        items: CartItem[];
        subtotal: number;
      }
    > = new Map();

    let totalSubtotal = 0;

    for (const item of cart.items) {
      const adminId = item.adminProduct.adminId;
      const adminName =
        item.adminProduct.admin?.businessName || 'Unknown Admin';
      const itemTotal = Number(item.adminProduct.price) * item.quantity;

      totalSubtotal += itemTotal;

      if (!adminGroups.has(adminId)) {
        adminGroups.set(adminId, {
          adminId,
          adminName,
          items: [],
          subtotal: 0,
        });
      }

      const group = adminGroups.get(adminId)!;
      group.items.push(item);
      group.subtotal += itemTotal;
    }

    return {
      cart,
      summary: {
        itemCount: cart.items.length,
        subtotal: totalSubtotal,
        adminGroups: Array.from(adminGroups.values()),
      },
    };
  }

  // Add item to cart
  async addToCart(addDto: AddToCartDto, client: User): Promise<Cart> {
    const cart = await this.getOrCreateCart(client.id);

    // Verify product exists and is available
    const adminProduct = await this.adminProductRepository.findOne({
      where: { id: addDto.adminProductId, isAvailable: true },
      relations: ['globalProduct'],
    });

    if (!adminProduct) {
      throw new NotFoundException('Product not found or not available');
    }

    if (adminProduct.quantity < addDto.quantity) {
      throw new BadRequestException(
        `Not enough stock. Available: ${adminProduct.quantity}`,
      );
    }

    // Check if item already in cart
    let cartItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, adminProductId: addDto.adminProductId },
    });

    if (cartItem) {
      // Update quantity
      const newQuantity = cartItem.quantity + addDto.quantity;
      if (adminProduct.quantity < newQuantity) {
        throw new BadRequestException(
          `Not enough stock. Available: ${adminProduct.quantity}`,
        );
      }
      cartItem.quantity = newQuantity;
      await this.cartItemRepository.save(cartItem);
    } else {
      // Add new item
      cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        adminProductId: addDto.adminProductId,
        quantity: addDto.quantity,
      });
      await this.cartItemRepository.save(cartItem);
    }

    return this.getOrCreateCart(client.id);
  }

  // Update cart item quantity
  async updateCartItem(
    adminProductId: string,
    updateDto: UpdateCartItemDto,
    client: User,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(client.id);

    const cartItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, adminProductId },
    });

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    // Verify stock
    const adminProduct = await this.adminProductRepository.findOne({
      where: { id: adminProductId },
    });

    if (!adminProduct || adminProduct.quantity < updateDto.quantity) {
      throw new BadRequestException(
        `Not enough stock. Available: ${adminProduct?.quantity || 0}`,
      );
    }

    cartItem.quantity = updateDto.quantity;
    await this.cartItemRepository.save(cartItem);

    return this.getOrCreateCart(client.id);
  }

  // Remove item from cart
  async removeFromCart(adminProductId: string, client: User): Promise<Cart> {
    const cart = await this.getOrCreateCart(client.id);

    const cartItem = await this.cartItemRepository.findOne({
      where: { cartId: cart.id, adminProductId },
    });

    if (!cartItem) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.cartItemRepository.remove(cartItem);

    return this.getOrCreateCart(client.id);
  }

  // Clear cart
  async clearCart(client: User): Promise<{ message: string }> {
    const cart = await this.getOrCreateCart(client.id);

    await this.cartItemRepository.delete({ cartId: cart.id });

    return { message: 'Cart cleared successfully' };
  }

  // Clear cart items for specific admin (after order)
  async clearAdminItems(clientId: string, adminId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({
      where: { clientId },
      relations: ['items', 'items.adminProduct'],
    });

    if (!cart) return;

    const itemsToRemove = cart.items.filter(
      (item) => item.adminProduct.adminId === adminId,
    );

    for (const item of itemsToRemove) {
      await this.cartItemRepository.remove(item);
    }
  }

  // =========================================================================
  // DELIVERY OPTIONS FOR COMMON CATEGORY PRODUCTS
  // =========================================================================

  /**
   * Calculate delivery options for cart items from common categories
   * Returns:
   * - All delivery options (one per admin in cart)
   * - Self-pickup option (0 delivery, commande wajda katsnah)
   */
  async calculateDeliveryOptions(client: User) {
    const cart = await this.getOrCreateCart(client.id);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Group items by admin
    const adminGroups = new Map<
      string,
      {
        adminId: string;
        businessName: string;
        businessLogo: string;
        phone: string;
        city: string;
        location: string;
        deliveryFee: number;
        productsTotal: number;
        items: {
          adminProductId: string;
          productName: string;
          productImage: string;
          price: number;
          quantity: number;
          itemTotal: number;
        }[];
      }
    >();

    let totalProductsPrice = 0;

    for (const item of cart.items) {
      const adminProduct = item.adminProduct;
      const admin = adminProduct.admin;
      const adminId = admin.id;

      const itemTotal = Number(adminProduct.price) * item.quantity;
      totalProductsPrice += itemTotal;

      if (!adminGroups.has(adminId)) {
        adminGroups.set(adminId, {
          adminId,
          businessName: admin.businessName || '',
          businessLogo: admin.businessLogo || '',
          phone: admin.phone || '',
          city: admin.city || '',
          location: adminProduct.location || '',
          deliveryFee: Number(adminProduct.livraisonMemeVille) || 0,
          productsTotal: 0,
          items: [],
        });
      }

      const group = adminGroups.get(adminId)!;
      group.productsTotal += itemTotal;
      group.items.push({
        adminProductId: adminProduct.id,
        productName: adminProduct.globalProduct?.nameFr || 'Product',
        productImage: adminProduct.globalProduct?.images?.[0] || '',
        price: Number(adminProduct.price),
        quantity: item.quantity,
        itemTotal,
      });
    }

    // Build delivery options (one per admin)
    const deliveryOptions = Array.from(adminGroups.values()).map((group) => ({
      adminId: group.adminId,
      businessName: group.businessName,
      businessLogo: group.businessLogo,
      phone: group.phone,
      city: group.city,
      location: group.location,
      productsTotal: group.productsTotal,
      deliveryFee: group.deliveryFee,
      total: group.productsTotal + group.deliveryFee,
      itemsCount: group.items.length,
      items: group.items,
    }));

    // Self-pickup option
    const selfPickupOption = {
      productsTotal: totalProductsPrice,
      deliveryFee: 0,
      total: totalProductsPrice,
      adminsCount: adminGroups.size,
      message: 'Commande wajda katsnah - ymchi tjiha bydik',
      admins: Array.from(adminGroups.values()).map((group) => ({
        adminId: group.adminId,
        businessName: group.businessName,
        phone: group.phone,
        city: group.city,
        location: group.location,
        productsTotal: group.productsTotal,
        itemsCount: group.items.length,
      })),
    };

    return {
      deliveryOptions,
      selfPickupOption,
    };
  }
}
