/**
 * Database verification utility
 * Helps ensure the database structure matches our Prisma schema
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verify that key tables and columns required by the application exist
 * @returns {Promise<{success: boolean, message: string, missingTables: string[], missingColumns: Object}>}
 */
async function verifyDatabaseStructure() {
  console.log('🔍 Verifying database structure...');
  const result = {
    success: true,
    message: 'Database structure verification successful',
    missingTables: [],
    missingColumns: {}
  };

  try {
    // Get all tables in the database
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log(`Found ${tables.length} tables in database`);
    
    // Define required tables that must exist for the app to function
    const requiredTables = [
      'User', 'TourPackage', 'Agency', 'Booking', 
      'Customer', 'Wishlist', 'Destination'
    ];
    
    // Check if required tables exist
    const tableNames = tables.map(t => t.table_name);
    for (const requiredTable of requiredTables) {
      if (!tableNames.includes(requiredTable)) {
        result.success = false;
        result.missingTables.push(requiredTable);
      }
    }
    
    // Define critical columns that must exist for key tables
    const requiredColumns = {
      'TourPackage': ['id', 'title', 'description', 'price', 'tourType', 'status', 'agencyId'],
      'User': ['id', 'email', 'role', 'status'],
      'Agency': ['id', 'name'],
      'Booking': ['id', 'tourPackageId', 'userId']
    };
    
    // Check if required columns exist for each key table
    for (const [table, columns] of Object.entries(requiredColumns)) {
      if (!result.missingTables.includes(table)) {
        const tableColumns = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${table}
        `;
        
        const columnNames = tableColumns.map(c => c.column_name);
        const missingColumns = columns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
          result.success = false;
          result.missingColumns[table] = missingColumns;
        }
      }
    }
    
    if (!result.success) {
      result.message = 'Database structure verification failed';
      console.error('❌ Database verification failed:');
      
      if (result.missingTables.length > 0) {
        console.error(`Missing tables: ${result.missingTables.join(', ')}`);
      }
      
      for (const [table, columns] of Object.entries(result.missingColumns)) {
        console.error(`Table ${table} missing columns: ${columns.join(', ')}`);
      }
      
      console.error('Please run database migrations to fix these issues.');
    } else {
      console.log('✅ Database structure verification passed');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error verifying database structure:', error);
    return {
      success: false,
      message: `Database verification error: ${error.message}`,
      error: error
    };
  }
}

/**
 * Apply emergency fixes for minor schema issues
 * @returns {Promise<void>}
 */
async function applyEmergencyFixes() {
  try {
    console.log('🔧 Applying emergency database fixes...');
    
    // Check and add title column to TourPackage if missing
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TourPackage' AND column_name = 'title') THEN
          ALTER TABLE "TourPackage" ADD COLUMN "title" TEXT;
          
          -- Copy name to title if name exists
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'TourPackage' AND column_name = 'name') THEN
            UPDATE "TourPackage" SET "title" = "name" WHERE "title" IS NULL;
          END IF;
        END IF;
      END $$;
    `);
    
    // Add other essential columns
    await prisma.$executeRawUnsafe(`
      ALTER TABLE IF EXISTS "TourPackage" ADD COLUMN IF NOT EXISTS "description" TEXT;
      ALTER TABLE IF EXISTS "TourPackage" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE';
    `);
    
    console.log('✅ Emergency fixes applied successfully');
  } catch (error) {
    console.error('❌ Error applying emergency fixes:', error);
  }
}

module.exports = {
  verifyDatabaseStructure,
  applyEmergencyFixes
}; 