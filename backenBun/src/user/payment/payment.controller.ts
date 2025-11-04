import { Elysia, t } from 'elysia';
import { PaymentService } from './payment.service';

export const paymentController = (paymentService: PaymentService) =>
  new Elysia({ prefix: '/api/payment' })
    
    // Add payment card
    .post(
      '/cards',
      async ({ body, user, set }: any) => {
        try {
          if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
          }

          const { token } = body;
          const result = await PaymentService.addPaymentCard(user.id, token);
          
          return {
            success: true,
            message: 'เพิ่มบัตรเครดิตสำเร็จ',
            data: result
          };
        } catch (error: any) {
          console.error('Add payment card error:', error);
          set.status = 400;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการเพิ่มบัตรเครดิต'
          };
        }
      },
      {
        body: t.Object({
          token: t.String()
        })
      }
    )

    // Get payment cards
    .get(
      '/cards',
      async ({ user, set }: any) => {
        try {
          if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
          }

          const cards = await PaymentService.getPaymentCards(user.id);
          
          return {
            success: true,
            data: cards
          };
        } catch (error: any) {
          console.error('Get payment cards error:', error);
          set.status = 500;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลบัตรเครดิต'
          };
        }
      }
    )

    // Remove payment card
    .delete(
      '/cards/:cardId',
      async ({ params, user, set }: any) => {
        try {
          if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
          }

          const { cardId } = params;
          await PaymentService.removePaymentCard(user.id, cardId);
          
          return {
            success: true,
            message: 'ลบบัตรเครดิตสำเร็จ'
          };
        } catch (error: any) {
          console.error('Remove payment card error:', error);
          set.status = 400;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการลบบัตรเครดิต'
          };
        }
      },
      {
        params: t.Object({
          cardId: t.String()
        })
      }
    )

    // Set default payment card
    .put(
      '/cards/:cardId/default',
      async ({ params, user, set }: any) => {
        try {
          if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
          }

          const { cardId } = params;
          await PaymentService.setDefaultCard(user.id, cardId);
          
          return {
            success: true,
            message: 'ตั้งบัตรเครดิตเป็นค่าเริ่มต้นสำเร็จ'
          };
        } catch (error: any) {
          console.error('Set default payment card error:', error);
          set.status = 400;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการตั้งบัตรเครดิตเป็นค่าเริ่มต้น'
          };
        }
      },
      {
        params: t.Object({
          cardId: t.String()
        })
      }
    )

    // Process payment for transaction
    .post(
      '/process',
      async ({ body, user, set }: any) => {
        try {
          if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
          }

          const { transactionId, cardId } = body;
          const result = await PaymentService.processPayment(transactionId, cardId);
          
          return {
            success: true,
            message: 'ดำเนินการชำระเงินสำเร็จ',
            data: result
          };
        } catch (error: any) {
          console.error('Process payment error:', error);
          set.status = 400;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดำเนินการชำระเงิน'
          };
        }
      },
      {
        body: t.Object({
          transactionId: t.String(),
          cardId: t.Optional(t.String())
        })
      }
    )

    // Get payment history
    .get(
      '/history',
      async ({ query, user, set }: any) => {
        try {
          if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
          }

          const page = parseInt(query.page || '1');
          const limit = parseInt(query.limit || '10');
          
          const history = await PaymentService.getPaymentHistory(user.id, page, limit);
          
          return {
            success: true,
            data: history
          };
        } catch (error: any) {
          console.error('Get payment history error:', error);
          set.status = 500;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการดึงประวัติการชำระเงิน'
          };
        }
      },
      {
        query: t.Object({
          page: t.Optional(t.String()),
          limit: t.Optional(t.String())
        })
      }
    )

    // Handle 3D Secure return
    .get(
      '/3ds/return',
      async ({ query, set }: any) => {
        try {
          const { charge_id, status } = query;
          
          if (!charge_id) {
            set.status = 400;
            return {
              success: false,
              message: 'Missing charge_id parameter'
            };
          }

          const result = await PaymentService.finalizeChargeStatus(
            charge_id,
            status ?? 'failed'
          );

          if (result.success) {
            return {
              success: true,
              message: 'การชำระเงินสำเร็จ',
              redirect: `${process.env.FRONTEND_URL}/payment/success?charge_id=${charge_id}`
            };
          }

          return {
            success: false,
            message: 'การชำระเงินล้มเหลว',
            redirect: `${process.env.FRONTEND_URL}/payment/failed?charge_id=${charge_id}`
          };
        } catch (error: any) {
          console.error('3DS return error:', error);
          set.status = 500;
          return {
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการประมวลผล 3D Secure'
          };
        }
      },
      {
        query: t.Object({
          charge_id: t.String(),
          status: t.Optional(t.String())
        })
      }
    );
