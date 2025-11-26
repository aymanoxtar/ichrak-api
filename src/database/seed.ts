import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { DomainType, CategoryType, Role } from '../common/enums';
import * as bcrypt from 'bcrypt';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL
    ? undefined
    : process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_URL
    ? undefined
    : parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_URL
    ? undefined
    : process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_URL
    ? undefined
    : process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_URL
    ? undefined
    : process.env.DATABASE_NAME || 'ichrak_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

interface UserRecord {
  id: string;
  email: string;
}

interface DomainRecord {
  id: string;
  type: string;
}

interface CategoryRecord {
  id: string;
  type: string;
}

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Database connected!');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Create Super Admin
    const hashedPassword = await bcrypt.hash('admin123456', 10);

    const existingSuperAdmin = (await queryRunner.query(
      `SELECT * FROM users WHERE email = 'admin@ichrak.com'`,
    )) as UserRecord[];

    if (existingSuperAdmin.length === 0) {
      const [superAdmin] = (await queryRunner.query(
        `INSERT INTO users (email, password, "firstName", "lastName", role, "isActive")
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          'admin@ichrak.com',
          hashedPassword,
          'Super',
          'Admin',
          Role.SUPER_ADMIN,
          true,
        ],
      )) as UserRecord[];
      console.log(`✓ Super Admin created with id: ${superAdmin.id}`);
    } else {
      console.log('✓ Super Admin already exists');
    }

    // Create Domains
    const domainData = [
      {
        type: DomainType.PIECE_AUTO,
        name: 'Pièces Auto',
        description: 'Tout pour votre automobile',
      },
      {
        type: DomainType.DROGUERIE,
        name: 'Droguerie',
        description: 'Matériaux de construction et peinture',
      },
    ];

    const domains: Record<string, string> = {};
    for (const domain of domainData) {
      const existing = (await queryRunner.query(
        `SELECT * FROM domains WHERE type = $1`,
        [domain.type],
      )) as DomainRecord[];

      if (existing.length === 0) {
        const [result] = (await queryRunner.query(
          `INSERT INTO domains (type, name, description) VALUES ($1, $2, $3) RETURNING id`,
          [domain.type, domain.name, domain.description],
        )) as DomainRecord[];
        domains[domain.type] = result.id;
        console.log(`✓ Domain created: ${domain.name}`);
      } else {
        domains[domain.type] = existing[0].id;
        console.log(`✓ Domain exists: ${domain.name}`);
      }
    }

    // Create Categories for Pièces Auto
    const pieceAutoCategories = [
      {
        type: CategoryType.LAVAGE,
        name: 'Lavage Auto',
        description: 'Services de lavage automobile',
        icon: '🚿',
      },
      {
        type: CategoryType.PARKING,
        name: 'Parking',
        description: 'Services de parking',
        icon: '🅿️',
      },
      {
        type: CategoryType.MECANICIEN,
        name: 'Mécanicien',
        description: 'Réparation et entretien automobile',
        icon: '🔧',
      },
      {
        type: CategoryType.VISITE_TECHNIQUE,
        name: 'Visite Technique',
        description: 'Contrôle technique automobile',
        icon: '📋',
      },
    ];

    for (const category of pieceAutoCategories) {
      const existing = (await queryRunner.query(
        `SELECT * FROM categories WHERE type = $1`,
        [category.type],
      )) as CategoryRecord[];

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO categories (type, name, description, icon, "domainId") VALUES ($1, $2, $3, $4, $5)`,
          [
            category.type,
            category.name,
            category.description,
            category.icon,
            domains[DomainType.PIECE_AUTO],
          ],
        );
        console.log(`✓ Category created: ${category.name}`);
      } else {
        console.log(`✓ Category exists: ${category.name}`);
      }
    }

    // Create Categories for Droguerie
    const droguerieCategories = [
      {
        type: CategoryType.PEINTRE,
        name: 'Peintre',
        description: 'Services de peinture',
        icon: '🎨',
      },
      {
        type: CategoryType.MACON,
        name: 'Maçon',
        description: 'Travaux de maçonnerie',
        icon: '🧱',
      },
      {
        type: CategoryType.PLOMBIER,
        name: 'Plombier',
        description: 'Services de plomberie',
        icon: '🔧',
      },
      {
        type: CategoryType.ELECTRICIEN,
        name: 'Électricien',
        description: 'Services électriques',
        icon: '⚡',
      },
    ];

    for (const category of droguerieCategories) {
      const existing = (await queryRunner.query(
        `SELECT * FROM categories WHERE type = $1`,
        [category.type],
      )) as CategoryRecord[];

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO categories (type, name, description, icon, "domainId") VALUES ($1, $2, $3, $4, $5)`,
          [
            category.type,
            category.name,
            category.description,
            category.icon,
            domains[DomainType.DROGUERIE],
          ],
        );
        console.log(`✓ Category created: ${category.name}`);
      } else {
        console.log(`✓ Category exists: ${category.name}`);
      }
    }

    // Create Domain-specific Admins
    console.log('\n=== Creating Domain Admins ===');

    const adminPieceAuto = (await queryRunner.query(
      `SELECT * FROM users WHERE email = 'admin.pieceauto@ichrak.com'`,
    )) as UserRecord[];

    if (adminPieceAuto.length === 0) {
      await queryRunner.query(
        `INSERT INTO users (email, password, "firstName", "lastName", role, "isActive", "businessName", "domainId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'admin.pieceauto@ichrak.com',
          hashedPassword,
          'Admin',
          'Pièces Auto',
          Role.ADMIN,
          true,
          'Boutique Pièces Auto',
          domains[DomainType.PIECE_AUTO],
        ],
      );
      console.log('✓ Admin Pièces Auto created');
    } else {
      console.log('✓ Admin Pièces Auto already exists');
    }

    const adminDroguerie = (await queryRunner.query(
      `SELECT * FROM users WHERE email = 'admin.droguerie@ichrak.com'`,
    )) as UserRecord[];

    if (adminDroguerie.length === 0) {
      await queryRunner.query(
        `INSERT INTO users (email, password, "firstName", "lastName", role, "isActive", "businessName", "domainId")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          'admin.droguerie@ichrak.com',
          hashedPassword,
          'Admin',
          'Droguerie',
          Role.ADMIN,
          true,
          'Boutique Droguerie',
          domains[DomainType.DROGUERIE],
        ],
      );
      console.log('✓ Admin Droguerie created');
    } else {
      console.log('✓ Admin Droguerie already exists');
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('\nSuper Admin:');
    console.log('  Email: admin@ichrak.com');
    console.log('  Password: admin123456');
    console.log('\nAdmin Pièces Auto:');
    console.log('  Email: admin.pieceauto@ichrak.com');
    console.log('  Password: admin123456');
    console.log('\nAdmin Droguerie:');
    console.log('  Email: admin.droguerie@ichrak.com');
    console.log('  Password: admin123456');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

void seed();
