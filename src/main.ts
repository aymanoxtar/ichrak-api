import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Ichrak API')
    .setDescription(
      'API Documentation for Ichrak Marketplace - Piece Auto & Droguerie',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Domains', 'Domain management (PIECE_AUTO, DROGUERIE)')
    .addTag('Categories', 'Service categories')
    .addTag('Product Categories', 'Product categories (hierarchical)')
    .addTag('Global Products', 'Product catalog management')
    .addTag('Admin Products', 'Admin-specific products and pricing')
    .addTag('Cart', 'Shopping cart operations')
    .addTag('Orders', 'Order management')
    .addTag('Promo Codes', 'Promotional codes system')
    .addTag('Locations', 'Delivery locations')
    .addTag('Pre-Calculated', 'Offers and pricing calculations')
    .addTag('Services', 'Service templates (Super Admin creates)')
    .addTag('Reviews', 'Client reviews for Artisans')
    .addTag('Artisans', 'Browse artisans by location (nearby search)')
    .addTag(
      'Admin - Referral Management',
      'Super Admin referral statistics and user management',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger Documentation: http://localhost:${port}/api`);
}
void bootstrap();
