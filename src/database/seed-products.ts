import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

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
  synchronize: false,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});

interface CategoryRecord {
  id: string;
  nameFr: string;
  parentId?: string;
}

async function seedProducts(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Database connected for product seeding!');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Create Product Categories (Hierarchical)
    console.log('\n=== Creating Product Categories ===');

    // Root categories for Pièces Auto
    const rootCategories = [
      {
        nameFr: 'Moteur',
        nameAr: 'المحرك',
        descriptionFr: 'Pièces pour moteur',
        descriptionAr: 'قطع غيار المحرك',
        icon: '⚙️',
      },
      {
        nameFr: 'Carrosserie',
        nameAr: 'هيكل السيارة',
        descriptionFr: 'Pièces de carrosserie',
        descriptionAr: 'قطع غيار الهيكل',
        icon: '🚗',
      },
      {
        nameFr: 'Électrique',
        nameAr: 'الكهرباء',
        descriptionFr: 'Composants électriques',
        descriptionAr: 'المكونات الكهربائية',
        icon: '⚡',
      },
      {
        nameFr: 'Peinture',
        nameAr: 'الدهان',
        descriptionFr: 'Matériaux de peinture',
        descriptionAr: 'مواد الطلاء',
        icon: '🎨',
      },
      {
        nameFr: 'Matériaux de Construction',
        nameAr: 'مواد البناء',
        descriptionFr: 'Matériaux pour construction',
        descriptionAr: 'مواد البناء والتشييد',
        icon: '🧱',
      },
    ];

    const createdRoots: Record<string, string> = {};
    for (const cat of rootCategories) {
      const existing = (await queryRunner.query(
        `SELECT * FROM product_categories WHERE "nameFr" = $1`,
        [cat.nameFr],
      )) as CategoryRecord[];

      if (existing.length === 0) {
        const [result] = (await queryRunner.query(
          `INSERT INTO product_categories ("nameFr", "nameAr", "descriptionFr", "descriptionAr", icon, "order")
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            cat.nameFr,
            cat.nameAr,
            cat.descriptionFr,
            cat.descriptionAr,
            cat.icon,
            0,
          ],
        )) as CategoryRecord[];
        createdRoots[cat.nameFr] = result.id;
        console.log(`✓ Created root category: ${cat.nameFr} / ${cat.nameAr}`);
      } else {
        createdRoots[cat.nameFr] = existing[0].id;
        console.log(`✓ Root category exists: ${cat.nameFr}`);
      }
    }

    // Subcategories for Moteur
    const moteurSubcats = [
      { nameFr: 'Filtres', nameAr: 'الفلاتر', parentKey: 'Moteur' },
      { nameFr: 'Huiles', nameAr: 'الزيوت', parentKey: 'Moteur' },
      { nameFr: 'Bougies', nameAr: 'شمعات الإشعال', parentKey: 'Moteur' },
    ];

    const createdSubs: Record<string, string> = {};
    for (const sub of moteurSubcats) {
      const existing = (await queryRunner.query(
        `SELECT * FROM product_categories WHERE "nameFr" = $1 AND "parentId" = $2`,
        [sub.nameFr, createdRoots[sub.parentKey]],
      )) as CategoryRecord[];

      if (existing.length === 0) {
        const [result] = (await queryRunner.query(
          `INSERT INTO product_categories ("nameFr", "nameAr", "parentId", "order")
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [sub.nameFr, sub.nameAr, createdRoots[sub.parentKey], 0],
        )) as CategoryRecord[];
        createdSubs[sub.nameFr] = result.id;
        console.log(`  ✓ Created subcategory: ${sub.nameFr} / ${sub.nameAr}`);
      } else {
        createdSubs[sub.nameFr] = existing[0].id;
      }
    }

    // Subcategories for Peinture
    const peintureSubcats = [
      {
        nameFr: 'Peinture Acrylique',
        nameAr: 'طلاء أكريليك',
        parentKey: 'Peinture',
      },
      {
        nameFr: 'Peinture à Huile',
        nameAr: 'طلاء زيتي',
        parentKey: 'Peinture',
      },
      { nameFr: 'Pinceaux', nameAr: 'فرش الطلاء', parentKey: 'Peinture' },
    ];

    for (const sub of peintureSubcats) {
      const existing = (await queryRunner.query(
        `SELECT * FROM product_categories WHERE "nameFr" = $1 AND "parentId" = $2`,
        [sub.nameFr, createdRoots[sub.parentKey]],
      )) as CategoryRecord[];

      if (existing.length === 0) {
        const [result] = (await queryRunner.query(
          `INSERT INTO product_categories ("nameFr", "nameAr", "parentId", "order")
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [sub.nameFr, sub.nameAr, createdRoots[sub.parentKey], 0],
        )) as CategoryRecord[];
        createdSubs[sub.nameFr] = result.id;
        console.log(`  ✓ Created subcategory: ${sub.nameFr} / ${sub.nameAr}`);
      } else {
        createdSubs[sub.nameFr] = existing[0].id;
      }
    }

    // Create Global Products
    console.log('\n=== Creating Global Products ===');

    const products = [
      {
        nameFr: 'Filtre à Huile',
        nameAr: 'فلتر الزيت',
        descriptionFr: 'Filtre à huile de haute qualité pour moteur automobile',
        descriptionAr: 'فلتر زيت عالي الجودة لمحرك السيارة',
        keywordsFr: ['filtre', 'huile', 'moteur', 'automobile'],
        keywordsAr: ['فلتر', 'زيت', 'محرك', 'سيارة'],
        images: ['https://example.com/filtre-huile.jpg'],
        videos: null as string[] | null,
        categoryNames: ['Filtres'],
      },
      {
        nameFr: 'Huile Moteur 5W30',
        nameAr: 'زيت محرك 5W30',
        descriptionFr: 'Huile moteur synthétique 5W30 pour toutes saisons',
        descriptionAr: 'زيت محرك صناعي 5W30 لجميع الفصول',
        keywordsFr: ['huile', 'moteur', '5w30', 'synthétique', 'lubrifiant'],
        keywordsAr: ['زيت', 'محرك', 'صناعي', 'تشحيم'],
        images: ['https://example.com/huile-5w30.jpg'],
        videos: ['https://example.com/video-huile.mp4'],
        categoryNames: ['Huiles'],
      },
      {
        nameFr: "Bougie d'Allumage",
        nameAr: 'شمعة الإشعال',
        descriptionFr: "Bougie d'allumage standard pour moteur essence",
        descriptionAr: 'شمعة إشعال قياسية لمحرك البنزين',
        keywordsFr: ['bougie', 'allumage', 'essence', 'spark plug'],
        keywordsAr: ['شمعة', 'إشعال', 'بنزين'],
        images: ['https://example.com/bougie.jpg'],
        videos: null as string[] | null,
        categoryNames: ['Bougies'],
      },
      {
        nameFr: 'Peinture Murale Blanche',
        nameAr: 'طلاء الجدران الأبيض',
        descriptionFr: 'Peinture acrylique blanche pour murs intérieurs',
        descriptionAr: 'طلاء أكريليك أبيض للجدران الداخلية',
        keywordsFr: ['peinture', 'blanc', 'mur', 'intérieur', 'acrylique'],
        keywordsAr: ['طلاء', 'أبيض', 'جدار', 'داخلي', 'أكريليك'],
        images: [
          'https://example.com/peinture-blanche-1.jpg',
          'https://example.com/peinture-blanche-2.jpg',
        ],
        videos: null as string[] | null,
        categoryNames: ['Peinture Acrylique'],
      },
      {
        nameFr: 'Pinceau Professionnel',
        nameAr: 'فرشاة احترافية',
        descriptionFr: 'Pinceau professionnel pour peinture de précision',
        descriptionAr: 'فرشاة احترافية للطلاء الدقيق',
        keywordsFr: ['pinceau', 'brosse', 'professionnel', 'peinture'],
        keywordsAr: ['فرشاة', 'احترافي', 'طلاء', 'دقيق'],
        images: ['https://example.com/pinceau.jpg'],
        videos: null as string[] | null,
        categoryNames: ['Pinceaux'],
      },
    ];

    for (const product of products) {
      const existing = (await queryRunner.query(
        `SELECT * FROM global_products WHERE "nameFr" = $1`,
        [product.nameFr],
      )) as { id: string }[];

      if (existing.length === 0) {
        const [createdProduct] = (await queryRunner.query(
          `INSERT INTO global_products
           ("nameFr", "nameAr", "descriptionFr", "descriptionAr", "keywordsFr", "keywordsAr", images, videos)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          [
            product.nameFr,
            product.nameAr,
            product.descriptionFr,
            product.descriptionAr,
            product.keywordsFr.join(','),
            product.keywordsAr.join(','),
            product.images.join(','),
            product.videos ? product.videos.join(',') : null,
          ],
        )) as { id: string }[];

        // Link product to categories
        for (const catName of product.categoryNames) {
          if (createdSubs[catName]) {
            await queryRunner.query(
              `INSERT INTO product_category_mapping ("productId", "categoryId")
               VALUES ($1, $2)`,
              [createdProduct.id, createdSubs[catName]],
            );
          }
        }

        console.log(`✓ Created product: ${product.nameFr} / ${product.nameAr}`);
      } else {
        console.log(`✓ Product exists: ${product.nameFr}`);
      }
    }

    console.log('\n🎉 Product seed completed successfully!');
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

void seedProducts();
