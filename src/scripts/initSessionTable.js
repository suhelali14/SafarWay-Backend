const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initSessionTable() {
  console.log('Initializing Session table in the database...');
  
  try {
    // Check if we can query the Session table
    try {
      await prisma.session.findFirst();
      console.log('Session table already exists');
      return true;
    } catch (error) {
      console.log('Session table not found, attempting to create it...');
    }
    
    // Try to run a migration to create the Session table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "session" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "metadata" JSONB,
          CONSTRAINT "session_pkey" PRIMARY KEY ("id")
        );
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session"("userId");
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "session_expiresAt_idx" ON "session"("expiresAt");
      `);
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "session" 
        ADD CONSTRAINT "session_userId_fkey" 
        FOREIGN KEY ("userId") 
        REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      
      console.log('✅ Session table created successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to create Session table:', error.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error initializing Session table:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if this script is run directly
if (require.main === module) {
  initSessionTable()
    .then(() => {
      console.log('Script execution completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { initSessionTable }; 