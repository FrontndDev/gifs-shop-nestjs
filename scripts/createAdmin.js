const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('Usage: node scripts/createAdmin.js <username> <password> [email]')
    console.log('Example: node scripts/createAdmin.js admin mypassword admin@example.com')
    process.exit(1)
  }

  const [username, password, email] = args

  try {
    // Проверяем, не существует ли уже такой username
    const existingAdmin = await prisma.admin.findUnique({
      where: { username }
    })

    if (existingAdmin) {
      console.log(`❌ Admin with username "${username}" already exists`)
      process.exit(1)
    }

    // Проверяем email, если он указан
    if (email) {
      const existingEmail = await prisma.admin.findUnique({
        where: { email }
      })

      if (existingEmail) {
        console.log(`❌ Admin with email "${email}" already exists`)
        process.exit(1)
      }
    }

    // Хешируем пароль
    const hashedPassword = bcrypt.hashSync(password, 10)

    // Создаем админа
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null
      },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        createdAt: true
      }
    })

    console.log('✅ Admin created successfully!')
    console.log('📋 Admin details:')
    console.log(`   ID: ${admin.id}`)
    console.log(`   Username: ${admin.username}`)
    console.log(`   Email: ${admin.email || 'Not set'}`)
    console.log(`   Active: ${admin.isActive}`)
    console.log(`   Created: ${admin.createdAt}`)
    
  } catch (error) {
    console.error('❌ Error creating admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
