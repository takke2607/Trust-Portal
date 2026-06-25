import { PrismaClient } from '../generated/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

let prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// If the cached client in dev mode is missing newly generated schema models, bypass the cached instance
if (prisma && !('systemSetting' in prisma)) {
  prisma = prismaClientSingleton();
}

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
