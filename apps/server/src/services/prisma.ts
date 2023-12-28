import { PrismaClient } from '@prisma/client'

// prisma is to postgres what mongoose is to mongo
const prismaClient = new PrismaClient({
    log: ['query']
})

export default prismaClient