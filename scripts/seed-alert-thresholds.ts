import { INDUSTRY_STANDARD_THRESHOLDS } from '../src/types/index';

/**
 * Seed Script: Initialize AlertThresholds collection with industry defaults
 * This script creates the AlertThresholds MongoDB collection
 * Run with: npx ts-node scripts/seed-alert-thresholds.ts
 *
 * Collections Created:
 * 1. AlertThresholds - Per-app threshold configurations
 * 2. Alerts - Generated alerts for metrics
 * 3. AlertRules - Custom rules for triggering alerts
 */

const seedAlertThresholds = async () => {
  console.log('[Migration] Starting AlertThresholds collection setup...');

  // TODO: When MongoDB is connected, uncomment this:
  /*
  const db = getDatabase();

  // 1. Create AlertThresholds collection
  try {
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes('AlertThresholds')) {
      await db.createCollection('AlertThresholds');
      console.log('[Migration] Created AlertThresholds collection');
    }

    // 2. Create Alerts collection
    if (!collectionNames.includes('Alerts')) {
      await db.createCollection('Alerts');
      console.log('[Migration] Created Alerts collection');
    }

    // 3. Create AlertRules collection
    if (!collectionNames.includes('AlertRules')) {
      await db.createCollection('AlertRules');
      console.log('[Migration] Created AlertRules collection');
    }

    // 4. Seed default global threshold configuration
    const thresholdsCollection = db.collection('AlertThresholds');
    const existingDefault = await thresholdsCollection.findOne({ id: 'industry-default' });

    if (!existingDefault) {
      await thresholdsCollection.insertOne({
        ...INDUSTRY_STANDARD_THRESHOLDS,
        _id: undefined, // Let MongoDB generate the _id
      });
      console.log('[Migration] Seeded industry standard thresholds');
    } else {
      console.log('[Migration] Industry standard thresholds already exist');
    }

    // 5. Create indexes
    await thresholdsCollection.createIndex({ appId: 1 });
    await db.collection('Alerts').createIndex({ appId: 1 });
    await db.collection('Alerts').createIndex({ timestamp: -1 });
    await db.collection('AlertRules').createIndex({ appId: 1 });

    console.log('[Migration] Created indexes successfully');
    console.log('[Migration] AlertThresholds collection setup completed');
  } catch (error) {
    console.error('[Migration] Error during setup:', error);
    throw error;
  }
  */

  console.log('[Migration] Seed data structure ready. Configure MongoDB connection and uncomment code to execute.');
};

// Export for use in other scripts or direct execution
export { seedAlertThresholds };

// Direct execution support
if (require.main === module) {
  seedAlertThresholds().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
