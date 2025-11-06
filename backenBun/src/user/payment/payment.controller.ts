import { Elysia, t } from 'elysia';
import { PaymentService } from './payment.service';

export const paymentController = (paymentService: PaymentService) =>
  new Elysia({ prefix: '/api/payment' })
    
    // Add payment card
    .post(
      '/cards',
      async ({ body, request, set }: any) => {
        const user = (request as any).user || (request as any).elysiaContext?.user;
        console.log('Add payment card request /api/payment/cards', body);
        console.log('Add payment card request /api/payment/cards user', user);
        try {
          if (!user) {
            set.status = 401;
            return { success: false, message: 'Unauthorized' };
          }

          const { token, setDefault } = body;
          const result = await PaymentService.addPaymentCard(user.id, token, setDefault);
          console.log('Add payment card result:', result);
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
        detail: {
          tags: ['Payment'],
          summary: '💳 Add Payment Card',
          description: `
Add a new payment card to the user's account using Omise token.

**Process Flow:**
1. Client tokenizes card using Omise.js
2. Send token to this endpoint
3. Card is registered with Omise and saved to user account
4. Optionally set as default payment method

**Security:**
- Requires valid JWT token
- Card details never touch the server
- Uses PCI-compliant tokenization
          `,
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['token'],
                  properties: {
                    token: {
                      type: 'string',
                      description: 'Omise token generated from card details',
                      example: 'tokn_test_5xj6h36c0j1p2kxqskt'
                    },
                    setDefault: {
                      type: 'boolean',
                      description: 'Set this card as default payment method',
                      default: false,
                      example: true
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Card added successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'เพิ่มบัตรเครดิตสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', example: 'card_uuid_123' },
                          lastDigits: { type: 'string', example: '4242' },
                          brand: { type: 'string', example: 'Visa' },
                          isDefault: { type: 'boolean', example: true }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Invalid token or card already exists',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Invalid card token' }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized - missing or invalid token',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Unauthorized' }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          token: t.String(),
          setDefault: t.Optional(t.Boolean())
        })
      }
    )

    // Get payment cards
    .get(
      '/cards',
      async ({ request, set }: any) => {
        const user = (request as any).user || (request as any).elysiaContext?.user;
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
      },
      {
        detail: {
          tags: ['Payment'],
          summary: '📋 Get Payment Cards',
          description: `
Retrieve all payment cards associated with the authenticated user's account.

**Returns:**
- List of saved payment cards
- Card details (masked for security)
- Default card indicator

**Security:**
- Requires valid JWT token
- Only returns user's own cards
- Card numbers are masked
          `,
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Cards retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', example: 'card_uuid_123' },
                            lastDigits: { type: 'string', example: '4242' },
                            brand: { type: 'string', example: 'Visa' },
                            expiryMonth: { type: 'number', example: 12 },
                            expiryYear: { type: 'number', example: 2025 },
                            isDefault: { type: 'boolean', example: true },
                            createdAt: { type: 'string', format: 'date-time' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Unauthorized' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    )

    // Remove payment card
    .delete(
      '/cards/:cardId',
      async ({ params, request, set }: any) => {
        const user = (request as any).user || (request as any).elysiaContext?.user;
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
        detail: {
          tags: ['Payment'],
          summary: '🗑️ Remove Payment Card',
          description: `
Remove a payment card from the user's account.

**Security Notes:**
- Card is removed from both local database and Omise
- Cannot remove default card if it's the only card
- If removed card was default, system will auto-assign new default
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'cardId',
              in: 'path',
              required: true,
              description: 'Payment card ID to remove',
              schema: { type: 'string', example: 'card_uuid_123' }
            }
          ],
          responses: {
            200: {
              description: 'Card removed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ลบบัตรเครดิตสำเร็จ' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Card not found or cannot be removed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Cannot remove default card' }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Unauthorized' }
                    }
                  }
                }
              }
            }
          }
        },
        params: t.Object({
          cardId: t.String()
        })
      }
    )

    // Set default payment card
    .put(
      '/cards/:cardId/default',
      async ({ params, request, set }: any) => {
        const user = (request as any).user || (request as any).elysiaContext?.user;
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
        detail: {
          tags: ['Payment'],
          summary: '⭐ Set Default Payment Card',
          description: `
Set a specific payment card as the default payment method.

**Behavior:**
- Previous default card will be unmarked
- New default will be used for automatic payments
- Card must belong to the authenticated user
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'cardId',
              in: 'path',
              required: true,
              description: 'Payment card ID to set as default',
              schema: { type: 'string', example: 'card_uuid_123' }
            }
          ],
          responses: {
            200: {
              description: 'Default card updated successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ตั้งบัตรเครดิตเป็นค่าเริ่มต้นสำเร็จ' }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Card not found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Card not found' }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Unauthorized' }
                    }
                  }
                }
              }
            }
          }
        },
        params: t.Object({
          cardId: t.String()
        })
      }
    )

    // Process payment for transaction
    .post(
      '/process',
      async ({ body, request, set }: any) => {
        const user = (request as any).user || (request as any).elysiaContext?.user;
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
        detail: {
          tags: ['Payment'],
          summary: '💰 Process Payment',
          description: `
Process payment for a completed charging transaction.

**Process Flow:**
1. Verify transaction is completed and unpaid
2. Calculate total amount based on energy consumed
3. Create charge via Omise payment gateway
4. Handle 3D Secure if required
5. Update payment and transaction status

**Payment Calculation:**
- Based on peak/off-peak rates
- Includes any applicable fees
- Currency: THB (Thai Baht)
          `,
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['transactionId'],
                  properties: {
                    transactionId: {
                      type: 'string',
                      description: 'ID of the completed transaction to pay for',
                      example: 'txn_uuid_123'
                    },
                    cardId: {
                      type: 'string',
                      description: 'Payment card ID to use. If not provided, uses default card.',
                      example: 'card_uuid_456'
                    }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Payment processed successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'ดำเนินการชำระเงินสำเร็จ' },
                      data: {
                        type: 'object',
                        properties: {
                          paymentId: { type: 'string', example: 'pay_uuid_789' },
                          amount: { type: 'number', example: 150.50 },
                          currency: { type: 'string', example: 'THB' },
                          status: { type: 'string', example: 'SUCCESS' },
                          authorizeUri: { 
                            type: 'string', 
                            description: '3D Secure URL if required',
                            example: null 
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Payment processing failed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Transaction not found or already paid' }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Unauthorized' }
                    }
                  }
                }
              }
            }
          }
        },
        body: t.Object({
          transactionId: t.String(),
          cardId: t.Optional(t.String())
        })
      }
    )

    // Get payment history
    .get(
      '/history',
      async ({ query, request, set }: any) => {
        const user = (request as any).user || (request as any).elysiaContext?.user;
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
        detail: {
          tags: ['Payment'],
          summary: '📜 Get Payment History',
          description: `
Retrieve paginated payment history for the authenticated user.

**Returns:**
- List of payment transactions
- Pagination information
- Transaction details including status

**Pagination:**
- Default: 10 items per page
- Maximum: 100 items per page
          `,
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              description: 'Page number (starting from 1)',
              schema: { type: 'string', default: '1', example: '1' }
            },
            {
              name: 'limit',
              in: 'query',
              description: 'Number of items per page',
              schema: { type: 'string', default: '10', example: '10' }
            }
          ],
          responses: {
            200: {
              description: 'Payment history retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          payments: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', example: 'pay_uuid_123' },
                                amount: { type: 'number', example: 150.50 },
                                currency: { type: 'string', example: 'THB' },
                                status: { type: 'string', example: 'SUCCESS' },
                                createdAt: { type: 'string', format: 'date-time' },
                                transaction: {
                                  type: 'object',
                                  properties: {
                                    id: { type: 'string' },
                                    startTime: { type: 'string', format: 'date-time' },
                                    endTime: { type: 'string', format: 'date-time' }
                                  }
                                }
                              }
                            }
                          },
                          pagination: {
                            type: 'object',
                            properties: {
                              page: { type: 'number', example: 1 },
                              limit: { type: 'number', example: 10 },
                              total: { type: 'number', example: 25 },
                              totalPages: { type: 'number', example: 3 }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Unauthorized' }
                    }
                  }
                }
              }
            }
          }
        },
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
        detail: {
          tags: ['Payment'],
          summary: '🔐 Handle 3D Secure Return',
          description: `
Handle return from 3D Secure authentication page.

**Process Flow:**
1. User completes 3D Secure authentication
2. Payment gateway redirects to this endpoint
3. System verifies charge status with Omise
4. Updates payment record
5. Redirects user to success/failure page

**Note:** This endpoint is typically called by Omise, not directly by clients.
          `,
          parameters: [
            {
              name: 'charge_id',
              in: 'query',
              required: true,
              description: 'Omise charge ID to verify',
              schema: { type: 'string', example: 'chrg_test_5xj6h36c0j1p2kxqskt' }
            },
            {
              name: 'status',
              in: 'query',
              description: 'Charge status from payment gateway',
              schema: { type: 'string', example: 'successful' }
            }
          ],
          responses: {
            200: {
              description: 'Payment status verified and processed',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'การชำระเงินสำเร็จ' },
                      redirect: { 
                        type: 'string', 
                        example: 'https://app.example.com/payment/success?charge_id=chrg_123' 
                      }
                    }
                  }
                }
              }
            },
            400: {
              description: 'Missing required parameters',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'Missing charge_id parameter' }
                    }
                  }
                }
              }
            },
            500: {
              description: 'Error processing 3D Secure return',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: 'เกิดข้อผิดพลาดในการประมวลผล 3D Secure' }
                    }
                  }
                }
              }
            }
          }
        },
        query: t.Object({
          charge_id: t.String(),
          status: t.Optional(t.String())
        })
      }
    );
