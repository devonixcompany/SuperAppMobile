import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Logger } from '../../../../shared/utils/logger.js';
import type { User, UserRole, UserStatus } from '../../../../shared/types/index.js';

const logger = new Logger('UserService');

export class UserService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createUser(userData: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await this.prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          role: userData.role || 'USER'
        }
      });

      logger.info(`User created: ${user.id}`);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id }
      });

      if (!user) return null;

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      logger.error(`Failed to get user ${id}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) return null;

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      logger.error(`Failed to get user by email ${email}:`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { username }
      });

      if (!user) return null;

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      logger.error(`Failed to get user by username ${username}:`, error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<{
    firstName: string;
    lastName: string;
    avatar: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
  }>): Promise<User | null> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: updates
      });

      logger.info(`User updated: ${id}`);

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      logger.error(`Failed to update user ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id }
      });

      logger.info(`User deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete user ${id}:`, error);
      throw error;
    }
  }

  async getAllUsers(page: number = 1, limit: number = 10): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.user.count()
      ]);

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Failed to get users:', error);
      throw error;
    }
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) return null;

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) return null;

      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      logger.error(`Failed to validate password for ${email}:`, error);
      throw error;
    }
  }

  async searchUsers(query: string, page: number = 1, limit: number = 10): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } }
            ]
          },
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            avatar: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.user.count({
          where: {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } }
            ]
          }
        })
      ]);

      return {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error(`Failed to search users with query "${query}":`, error);
      throw error;
    }
  }
}