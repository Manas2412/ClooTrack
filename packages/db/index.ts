import { PrismaClient, Category, Priority, Status } from "./generated/prisma";

export const prisma = new PrismaClient();
export { Category, Priority, Status };