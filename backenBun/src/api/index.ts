import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import express from 'express';

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors());

// GET /chargepoints - ดึงข้อมูล ChargePoint ทั้งหมด
app.get('/chargepoints', async (req, res) => {
  try {
    const chargePoints = await prisma.chargePoint.findMany({
      include: {
        owner: true,
        connectors: true,
      },
    });
    res.json(chargePoints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chargepoints/:id - ดึงข้อมูล ChargePoint ตาม ID
app.get('/chargepoints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chargePoint = await prisma.chargePoint.findUnique({
      where: { id },
      include: {
        owner: true,
        connectors: true,
        transactions: true,
      },
    });
    
    if (!chargePoint) {
      return res.status(404).json({ error: 'ChargePoint not found' });
    }
    
    res.json(chargePoint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /chargepoints - สร้าง ChargePoint ใหม่
app.post('/chargepoints', async (req, res) => {
  try {
    console.log('Request body:', req.body); // Log request body

    // Validate required fields
    const requiredFields = ['id', 'name', 'location'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ 
          error: `Missing required field: ${field}`,
          receivedData: req.body 
        });
      }
    }

    const chargePoint = await prisma.chargePoint.create({
      data: {
        ...req.body,
        // กำหนดค่าเริ่มต้นสำหรับฟิลด์ที่จำเป็น
        powerRating3: 0,
        powerRating4: 0,
      },
    });
    res.status(201).json(chargePoint);
  } catch (error: any) {
    console.error('Detailed error:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ 
        error: 'A chargepoint with this ID already exists',
        details: error?.meta
      });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      details: error?.message || String(error)
    });
  }
});

// PUT /chargepoints/:id - อัพเดต ChargePoint
app.put('/chargepoints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chargePoint = await prisma.chargePoint.update({
      where: { id },
      data: req.body,
    });
    res.json(chargePoint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /chargepoints/:id - ลบ ChargePoint
app.delete('/chargepoints/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.chargePoint.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /chargepoints/:id/status - ดึงสถานะของ ChargePoint
app.get('/chargepoints/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const chargePoint = await prisma.chargePoint.findUnique({
      where: { id },
      select: {
        status: true,
        lastSeen: true,
        connectors: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
    
    if (!chargePoint) {
      return res.status(404).json({ error: 'ChargePoint not found' });
    }
    
    res.json(chargePoint);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});