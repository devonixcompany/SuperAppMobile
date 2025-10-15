import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { PrismaClient } from '@prisma/client';
import { hash, compare } from 'bcrypt';

const app = new Elysia()
  .use(cors())
  .use(jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET || 'your-secret-key'
  }));

const prisma = new PrismaClient();

// Auth routes
app.post('/api/auth/signup', async ({ body }) => {
  const { phoneNumber, password } = body as { phoneNumber: string; password: string };

  try {
    // เข้ารหัสรหัสผ่านก่อนบันทึก
    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        phoneNumber,
        password: hashedPassword,
        status: 'PENDING',
      },
    });

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({
      error: 'Registration failed'
    }), { status: 400 });
  }
});

app.post('/api/auth/verify-otp', async ({ body }) => {
  const { phoneNumber, firebaseUid } = body as { phoneNumber: string; firebaseUid: string };

  try {
    // อัปเดตผู้ใช้ด้วย Firebase UID และเปลี่ยนสถานะเป็น ACTIVE
    const user = await prisma.user.update({
      where: { phoneNumber },
      data: {
        firebaseUid,
        status: 'ACTIVE',
      },
    });

    return {
      message: 'User verified successfully',
      user
    };
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(JSON.stringify({
      error: 'Verification failed'
    }), { status: 400 });
  }
});

app.post('/api/auth/login', async ({ body, jwt }) => {
  const { phoneNumber, password } = body as { phoneNumber: string; password: string };

  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber }
    });

    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), { status: 404 });
    }

    if (user.status !== 'ACTIVE') {
      return new Response(JSON.stringify({
        error: 'User account is not active'
      }), { status: 403 });
    }

    // ตรวจสอบรหัสผ่าน
    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return new Response(JSON.stringify({
        error: 'Invalid password'
      }), { status: 401 });
    }

    // สร้าง JWT token
    const token = await jwt.sign({
      userId: user.id,
      phoneNumber: user.phoneNumber
    });

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        status: user.status
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      error: 'Login failed'
    }), { status: 400 });
  }
});

// Health check
app.get('/health', () => ({
  status: 'ok'
}));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.listen(port, () => {
  console.log(`🦊 Server is running on port ${port}`);
});