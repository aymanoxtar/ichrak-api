export enum OrderStatus {
  PENDING = 'PENDING', // طلبية جديدة، Admin ما شافهاش
  CONFIRMED = 'CONFIRMED', // Admin قبل الطلبية
  PREPARING = 'PREPARING', // Admin كيحضر الطلبية
  SHIPPED = 'SHIPPED', // Admin بدا التوصيل
  DELIVERED = 'DELIVERED', // وصلات + Client خلص CASH
  CANCELLED = 'CANCELLED', // ملغية
}
