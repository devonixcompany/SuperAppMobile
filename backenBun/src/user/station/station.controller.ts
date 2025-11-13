import { Elysia, t } from 'elysia';
import { StationService } from './station.service';

export const stationController = (stationService: StationService) =>
  new Elysia({ prefix: '/api/stations' })

    /**
     * ดึงรายการสถานีทั้งหมด
     * GET /api/stations
     */
    .get(
      '/',
      async ({ query, set }) => {
        try {
          const options = {
            page: query.page ? parseInt(query.page) : 1,
            limit: query.limit ? parseInt(query.limit) : 10,
            search: query.search
          };

          const result = await stationService.getAllStations(options);

          return {
            success: true,
            data: result.data,
            pagination: result.pagination,
            message: 'ดึงข้อมูลสถานีสำเร็จ'
          };
        } catch (error: any) {
          console.error('Error fetching stations:', error);
          set.status = 500;
          return {
            success: false,
            error: error.message,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานี'
          };
        }
      },
      {
        detail: {
          tags: ['Stations'],
          summary: '📋 Get All Stations',
          description: 'ดึงรายการสถานีชาร์จทั้งหมดพร้อม pagination และ search',
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              description: 'หน้าที่ต้องการ',
              schema: { type: 'string', default: '1' }
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'จำนวนรายการต่อหน้า',
              schema: { type: 'string', default: '10' }
            },
            {
              name: 'search',
              in: 'query',
              required: false,
              description: 'ค้นหาตามชื่อสถานีหรือสถานที่',
              schema: { type: 'string' }
            }
          ]
        },
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String()),
          search: t.Optional(t.String())
        })
      }
    )

    /**
     * ดึงข้อมูลสถานีตาม ID
     * GET /api/stations/:id
     */
    .get(
      '/:id',
      async ({ params, set }) => {
        try {
          const { id } = params;
          const station = await stationService.getStationById(id);

          if (!station) {
            set.status = 404;
            return {
              success: false,
              message: 'ไม่พบสถานีที่ระบุ'
            };
          }

          return {
            success: true,
            data: station,
            message: 'ดึงข้อมูลสถานีสำเร็จ'
          };
        } catch (error: any) {
          console.error('Error fetching station:', error);
          set.status = 500;
          return {
            success: false,
            error: error.message,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถานี'
          };
        }
      },
      {
        detail: {
          tags: ['Stations'],
          summary: '🔍 Get Station by ID',
          description: 'ดึงข้อมูลสถานีตาม ID พร้อมจุดชาร์จทั้งหมด',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID ของสถานี',
              schema: { type: 'string' }
            }
          ]
        },
        params: t.Object({
          id: t.String()
        })
      }
    )

    /**
     * ดึงจุดชาร์จของสถานี
     * GET /api/stations/:id/chargepoints
     */
    .get(
      '/:id/chargepoints',
      async ({ params, set }) => {
        try {
          const { id } = params;
          const result = await stationService.getStationChargePoints(id);

          return {
            success: true,
            data: result,
            message: 'ดึงข้อมูลจุดชาร์จสำเร็จ'
          };
        } catch (error: any) {
          console.error('Error fetching station charge points:', error);

          if (error.message === 'Station not found') {
            set.status = 404;
            return {
              success: false,
              error: error.message,
              message: 'ไม่พบสถานีที่ระบุ'
            };
          }

          set.status = 500;
          return {
            success: false,
            error: error.message,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลจุดชาร์จ'
          };
        }
      },
      {
        detail: {
          tags: ['Stations'],
          summary: '🔌 Get Station Charge Points',
          description: 'ดึงรายการจุดชาร์จทั้งหมดของสถานี',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'ID ของสถานี',
              schema: { type: 'string' }
            }
          ]
        },
        params: t.Object({
          id: t.String()
        })
      }
    )

    /**
     * ค้นหาสถานีใกล้เคียง
     * GET /api/stations/nearby
     */
    .get(
      '/nearby/search',
      async ({ query, set }) => {
        try {
          const { latitude, longitude, radius } = query;

          if (!latitude || !longitude) {
            set.status = 400;
            return {
              success: false,
              message: 'กรุณาระบุพิกัด latitude และ longitude'
            };
          }

          const lat = parseFloat(latitude);
          const lng = parseFloat(longitude);
          const radiusKm = radius ? parseFloat(radius) : 10;

          if (isNaN(lat) || isNaN(lng)) {
            set.status = 400;
            return {
              success: false,
              message: 'พิกัดไม่ถูกต้อง'
            };
          }

          const nearbyStations = await stationService.getStationsNearby(lat, lng, radiusKm);

          return {
            success: true,
            data: nearbyStations,
            searchParams: {
              latitude: lat,
              longitude: lng,
              radius: radiusKm
            },
            message: `พบสถานี ${nearbyStations.length} แห่งในรัศมี ${radiusKm} กิโลเมตร`
          };
        } catch (error: any) {
          console.error('Error finding nearby stations:', error);
          set.status = 500;
          return {
            success: false,
            error: error.message,
            message: 'เกิดข้อผิดพลาดในการค้นหาสถานีใกล้เคียง'
          };
        }
      },
      {
        detail: {
          tags: ['Stations'],
          summary: '📍 Find Nearby Stations',
          description: 'ค้นหาสถานีชาร์จใกล้เคียงตามพิกัด GPS',
          parameters: [
            {
              name: 'latitude',
              in: 'query',
              required: true,
              description: 'ละติจูด',
              schema: { type: 'string', example: '13.7563' }
            },
            {
              name: 'longitude',
              in: 'query',
              required: true,
              description: 'ลองจิจูด',
              schema: { type: 'string', example: '100.5018' }
            },
            {
              name: 'radius',
              in: 'query',
              required: false,
              description: 'รัศมีการค้นหา (กิโลเมตร)',
              schema: { type: 'string', default: '10' }
            }
          ]
        },
        query: t.Object({
          latitude: t.String(),
          longitude: t.String(),
          radius: t.Optional(t.String())
        })
      }
    );
