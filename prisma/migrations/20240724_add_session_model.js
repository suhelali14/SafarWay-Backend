const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Running migration: Adding Session model');
  
  try {
    // Check if Session table exists
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'session'
    `;
    
    // If Session table doesn't exist, create it
    if (tables.length === 0) {
      console.log('Session table does not exist, creating...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "session" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "expiresAt" TIMESTAMP(3) NOT NULL,
          "metadata" JSONB,
          
          CONSTRAINT "session_pkey" PRIMARY KEY ("id")
        );
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX "session_userId_idx" ON "session"("userId");
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX "session_expiresAt_idx" ON "session"("expiresAt");
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `;
      
      console.log('Session table created successfully');
    } else {
      console.log('Session table already exists');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 