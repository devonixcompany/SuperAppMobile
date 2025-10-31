import { prisma } from '../../lib/prisma';

export interface CreateUserData {
  firebaseUid: string;
  phoneNumber: string;
  email: string;
  password: string;
  typeUser: 'NORMAL' | 'BUSINESS';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export class UserService {
  async findUserByEmail(email: string) {
    return await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: email },
          { firebaseUid: email }
        ]
      }
    });
  }

  async findUserByPhoneNumber(phoneNumber: string) {
    return await prisma.user.findFirst({
      where: { phoneNumber }
    });
  }

  async findUserByRefreshToken(refreshToken: string) {
    return await prisma.user.findFirst({
      where: { refresh_token: refreshToken }
    });
  }

  async findUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  async createUser(data: CreateUserData) {
    return await prisma.user.create({
      data: {
        firebaseUid: data.firebaseUid,
        phoneNumber: data.phoneNumber,
        email: data.email,
        password: data.password,
        typeUser: data.typeUser,
        status: data.status
      }
    });
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { refresh_token: refreshToken }
    });
  }

  async updateUserProfile(userId: string, data: Partial<CreateUserData>) {
    return await prisma.user.update({
      where: { id: userId },
      data
    });
  }

  async deactivateUser(userId: string) {
    return await prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' }
    });
  }

  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          firebaseUid: true,
          phoneNumber: true,
          typeUser: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.user.count()
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}