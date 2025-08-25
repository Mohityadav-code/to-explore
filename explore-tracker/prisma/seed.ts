import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const initialCategories = [
  { name: 'AI_AGENTS', description: 'AI agents, LLMs, chatbots, and intelligent systems' },
  { name: 'RASPBERRY_PI', description: 'Raspberry Pi projects and hardware' },
  { name: 'PRINTER_3D', description: '3D printing, models, and fabrication' },
  { name: 'ELECTRONICS', description: 'Electronics projects, Arduino, sensors' },
  { name: 'SOFTWARE', description: 'Software development, libraries, frameworks' },
  { name: 'AUTOMATION', description: 'Workflow automation, no-code tools, integrations' },
  { name: 'WEB_TOOLS', description: 'Web applications, online tools, and services' },
  { name: 'PRODUCTIVITY', description: 'Productivity tools, time management, organization' },
  { name: 'MARKETING', description: 'Marketing, social media, growth strategies' },
  { name: 'OTHER', description: 'Miscellaneous and uncategorized items' },
];

async function main() {
  console.log('🌱 Seeding categories...');
  
  for (const category of initialCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
    console.log(`✅ Category: ${category.name}`);
  }
  
  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
