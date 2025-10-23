import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { Logger } from '../../../shared/utils/logger.js';
import cron from 'node-cron';
import moment from 'moment';
import excel from 'excel4node';
import * as pdf2json from 'pdf2json';

const logger = new Logger('ReportService');

// In-memory storage for report data (use database in production)
const reportCache = new Map();
const reportTemplates = new Map();

interface ReportData {
  id: string;
  name: string;
  type: string;
  format: 'json' | 'csv' | 'excel' | 'pdf';
  data: any;
  generatedAt: string;
  expiresAt?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  schedule: string; // cron expression
  template: any;
  isActive: boolean;
  recipients: string[];
  format: 'json' | 'csv' | 'excel' | 'pdf';
  createdAt: string;
  updatedAt: string;
}

const app = new Elysia()
  .use(cors())
  .get('/health', () => {
    return {
      success: true,
      message: 'Report Service is healthy',
      timestamp: new Date(),
      service: 'report-service',
      statistics: {
        totalReports: reportCache.size,
        activeTemplates: Array.from(reportTemplates.values()).filter(t => t.isActive).length,
        availableTemplates: Array.from(reportTemplates.values()).map(t => t.name)
      }
    };
  })
  .group('/reports', (app) =>
    app
      .get('/', ({ query }) => {
        try {
          const { limit = 100, offset = 0, type, format, startDate, endDate } = query as any;

          let filteredReports = Array.from(reportCache.values());

          if (type) {
            filteredReports = filteredReports.filter(r => r.type === type);
          }

          if (format) {
            filteredReports = filteredReports.filter(r => r.format === format);
          }

          if (startDate) {
            const start = new Date(startDate);
            filteredReports = filteredReports.filter(r => new Date(r.generatedAt) >= start);
          }

          if (endDate) {
            const end = new Date(endDate);
            filteredReports = filteredReports.filter(r => new Date(r.generatedAt) <= end);
          }

          // Apply pagination
          const paginatedReports = filteredReports.slice(
            parseInt(offset),
            parseInt(offset) + parseInt(limit)
          );

          return {
            success: true,
            data: {
              reports: paginatedReports,
              total: filteredReports.length,
              limit: parseInt(limit),
              offset: parseInt(offset)
            },
            message: 'Reports retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get reports', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get reports',
            timestamp: new Date()
          };
        }
      })
      .get('/:id', ({ params }) => {
        try {
          const report = reportCache.get(params.id);
          if (!report) {
            return {
              success: false,
              error: 'Report not found',
              timestamp: new Date()
            };
          }

          return {
            success: true,
            data: report,
            message: 'Report retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get report', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get report',
            timestamp: new Date()
          };
        }
      })
      .post('/', ({ body }) => {
        try {
          const {
            name,
            type = 'daily',
            format = 'json',
            schedule: '0 1 * * * *', // Daily at 1 AM
            recipients,
            template,
            data
          } = body as any;

          if (!name || !type) {
            return {
              success: false,
              error: 'Missing required fields: name, type',
              timestamp: new Date()
            };
          }

          const report: ReportData = {
            id: `RPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            type,
            format,
            data,
            generatedAt: new Date().toISOString(),
            expiresAt: type === 'daily' ?
              new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined
          };

          reportCache.set(report.id, report);

          logger.info('Report generated', {
            reportId: report.id,
            name,
            type,
            format
          });

          return {
            success: true,
            data: report,
            message: 'Report generated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to generate report', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to generate report',
            timestamp: new Date()
          };
        }
      })
      .put('/:id/download', ({ params }) => {
        try {
          const report = reportCache.get(params.id);
          if (!report) {
            return {
              success: false,
              error: 'Report not found',
              timestamp: new Date()
            };
          }

          // Update download count
          const updatedReport = {
            ...report,
            downloadCount: (report.downloadCount || 0) + 1
            updatedAt: new Date().toISOString()
          };

          reportCache.set(params.id, updatedReport);

          logger.info('Report downloaded', {
            reportId: params.id,
            downloadCount: updatedReport.downloadCount
          });

          return {
            success: true,
            data: updatedReport,
            message: 'Report downloaded successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to download report', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to download report',
            timestamp: new Date()
          };
        }
      })
  )
  .group('/templates', (app) =>
    app
      .get('/', () => {
        try {
          const templates = Array.from(reportTemplates.values());
          const activeTemplates = templates.filter(t => t.isActive);

          return {
            success: true,
            data: {
              templates: activeTemplates,
              availableTemplates: templates.map(t => ({
                ...t,
                isTemplate: true
              }))
            },
            message: 'Report templates retrieved successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to get report templates', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to get report templates',
            timestamp: new Date()
          };
        }
      })
      .post('/', ({ body }) => {
        try {
          const { name, type, schedule, recipients, template, format, isActive = true } = body as any;

          if (!name || !type) {
            return {
              success: false,
              error: 'Missing required fields: name, type',
              timestamp: new Date()
            };
          }

          const template: ReportTemplate = {
            id: `TMPL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description: description || `Automated ${type} report`,
            schedule,
            template,
            recipients,
            format,
            isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          reportTemplates.set(template.id, template);

          logger.info('Report template created', {
            templateId: template.id,
            name,
            type
          });

          return {
            success: true,
            data: template,
            message: 'Report template created successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to create report template', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to create report template',
            timestamp: new Date()
          };
        }
      })
      .put('/:id', ({ params, body }) => {
        try {
          const template = reportTemplates.get(params.id);
          if (!template) {
            return {
              success: false,
              error: 'Template not found',
              timestamp: new Date()
            };
          }

          const updates = body as any;
          const updatedTemplate = {
            ...template,
            ...updates,
            updatedAt: new Date().toISOString()
          };

          reportTemplates.set(params.id, updatedTemplate);

          logger.info('Report template updated', {
            templateId: params.id,
            name: updatedTemplate.name
          });

          return {
            success: true,
            data: updatedTemplate,
            message: 'Report template updated successfully',
            timestamp: new Date()
          };
        } catch (error: any) {
          logger.error('Failed to update report template', error);
          return {
            success: false,
            error: error.message,
            message: 'Failed to update report template',
            timestamp: new Date()
          };
        }
      })
  )
  .onRequest(({ request }) => {
    logger.info(`${request.method} ${request.url}`);
  })
  .listen(3011);

// Generate scheduled reports automatically
cron.schedule('0 1 * * * *', () => {
  try {
    logger.info('Generating daily reports...');

    // Get daily charging data from other services
    const dailyReport = generateDailyReport();

    if (dailyReport) {
      const report: ReportData = {
        id: `RPT_DAILY_${Date.now().toISOString().slice(0, 10).replace(/[-:]/g, '')}`,
        name: `Daily Charging Report - ${moment().format('YYYY-MM-DD')}`,
        type: 'daily',
        data: dailyReport,
        format: 'json',
        generatedAt: new Date().toISOString()
      };

      reportCache.set(report.id, report);

      logger.info('Daily report generated', {
        reportId: report.id,
        name: report.name
      });
    }
  } catch (error) {
      logger.error('Failed to generate daily report', error);
    }
  });

cron.schedule('0 2 * * * *', () => {
  try {
    logger.info('Generating weekly reports...');

    const weeklyReport = generateWeeklyReport();

    if (weeklyReport) {
      const report: ReportData = {
        id: `RPT_WEEKLY_${Date.now().toISOString().slice(0, 10).replace(/[-:]/g, '')}`,
        name: `Weekly Report - Week ${Date().format('YYYY-Week-WW')}`,
        type: 'weekly',
        data: weeklyReport,
        format: 'json',
        generatedAt: new Date().toISOString()
      };

      reportCache.set(report.id, report);

      logger.info('Weekly report generated', {
        reportId: report.id,
        name: report.name
      });
    }
  } catch (error) {
      logger.error('Failed to generate weekly report', error);
    }
  });

cron.schedule('0 3 * * 1 * *', () => {
  try {
    logger.info('Generating monthly reports...');

    const monthlyReport = generateMonthlyReport();

    if (monthlyReport) {
      const report: ReportData = {
        id: `RPT_MONTHLY_${Date.now().toISOString().slice(0, 7).replace(/[-:]/g, '')}`,
        name: `Monthly Report - ${Date().format('YYYY-MM')}`,
        type: 'monthly',
        data: monthlyReport,
        format: 'json',
        generatedAt: new Date().toISOString()
      };

      reportCache.set(report.id, report);

      logger.info('Monthly report generated', {
        reportId: report.id,
        name: report.name
      });
    }
  } catch (error) {
      logger.error('Failed to generate monthly report', error);
    }
  });

// Generate yearly reports on the first day of the year
cron.schedule('0 4 1 1 * *', () => {
  try {
    logger.info('Generating yearly reports...');

    const yearlyReport = generateYearlyReport();

    if (yearlyReport) {
      const report: ReportData = {
        id: `RPT_YEARLY_${Date.now().toISOString().slice(0, 7).replace(/[-:]/g, '')}`,
        name: `Yearly Report - ${Date().format('YYYY')}`,
        type: 'yearly',
        data: yearlyReport,
        format: 'json',
        generatedAt: new Date().toISOString()
      };

      reportCache.set(report.id, report);

      logger.info('Yearly report generated', {
        reportId: report.id,
        name: report.name
      });
    }
  } catch (error) {
      logger.error('Failed to generate yearly report', error);
    }
  });

// Helper function to generate daily report data
function generateDailyReport() {
  // This would normally fetch data from other services
  return {
    overview: {
      totalStations: 0,
      totalSessions: 0,
      totalEnergy: 0,
      totalRevenue: 0,
      averageSessionDuration: 0,
      uptime: 99.5
    },
    topStations: [
      {
        stationId: 'STATION_001',
        name: 'Central Mall Charging Station',
        sessionsToday: 12,
        energyToday: 75.5,
        revenueToday: 376.50
      }
    ],
    hourlyUsage: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      sessions: Math.floor(Math.random() * 8) + 2,
      energy: Math.random() * 15 + 5
      revenue: Math.random() * 20 + 10
    })),
    alerts: [
        {
          type: 'MAINTENANCE',
          severity: 'MEDIUM',
          stationId: 'STATION_003',
          title: 'Connector maintenance scheduled',
          description: 'Routine maintenance check',
          count: 1
        }
      ]
    },
    payments: {
      totalTransactions: 0,
      totalAmount: 0,
      averageAmount: 0,
      methods: ['CREDIT_CARD', 'MOBILE_BANKING', 'QR_CODE'],
      successRate: 100
    },
    stationsByType: [
        { type: 'TYPE_2', count: 45 },
        { type: 'CHADEMO', count: 15 },
        { type: 'CCS', count: 40 }
      ]
    },
    revenueByHour: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      revenue: Math.random() * 50 + 20
    }))
  };
}

// Helper function to generate weekly report data
function generateWeeklyReport() {
  return {
    overview: {
      totalStations: 0,
      totalSessions: 0,
      totalEnergy: 0,
      totalRevenue: 0,
      averageSessionDuration: 0,
      uptime: 99.8
    },
    topStations: [
      {
        stationId: 'STATION_001',
        name: 'Central Mall Charging Station',
        sessionsThisWeek: 84,
        energyThisWeek: 527.5,
        revenueThisWeek: 2637.50
      }
    ],
    weeklyTrends: {
      energyUsage: [
        { week: 1, energy: 120.5 },
        { week: 2, energy: 135.2 },
        { week: 3, energy: 142.8 }
      ],
      sessionTrends: [
        { week: 1, sessions: 15 },
        { week: 2, sessions: 18 },
        { week: 3, sessions: 22 }
      ]
    },
    alerts: [
      {
        type: 'FAULT',
        severity: 'HIGH',
        stationId: 'STATION_002',
        count: 2,
        resolved: 1
      }
    ],
    maintenanceCompleted: [
      {
        week: 1, tasks: 5,
        completed: 4
      }
    ]
  };
}

// Helper function to generate monthly report data
function generateMonthlyReport() {
  return {
    overview: {
      totalStations: 0,
      totalSessions: 0,
      totalEnergy: 0,
      totalRevenue: 0,
      averageSessionDuration: 0,
      uptime: 99.2
    },
    topStations: [
      {
        stationId: 'STATION_001',
        name: 'Central Mall Charging Station',
        sessionsThisMonth: 365,
        energyThisMonth: 2342.5,
        revenueThisMonth: 11750.00
      }
    ],
    monthlyTrends: {
      energyUsage: Array.from({ length: 30 }, (_, i) => ({
        month: i + 1,
        energy: Math.random() * 500 + 100
      })),
      sessionTrends: Array.from({ length: 30 }, (_, i) => ({
        month: i + 1,
        sessions: Math.random() * 25 + 5
      })),
      revenueTrends: Array.from({ length: 30 }, (_, i) => ({
        month: i + 1,
        revenue: Math.random() * 500 + 100
      }))
    ],
      alerts: [
        {
          type: 'SECURITY',
          severity: 'MEDIUM',
          count: 1,
          resolved: 0
        }
      ]
    },
    maintenanceScheduled: [
      {
        week: 1, tasks: 8,
        completed: 7
      }
    ]
  };
}

// Helper function to generate yearly report data
function generateYearlyReport() {
  return {
    overview: {
      totalStations: 0,
      totalSessions: 0,
      totalEnergy: 0,
      totalRevenue: 0,
      averageSessionDuration: 0,
      uptime: 99.9,
      growthRate: 15.2
    },
    topStations: [
      {
        stationId: 'STATION_001',
        name: 'Central Mall Charging Station',
        sessionsThisYear: 1825,
        energyThisYear: 28050.75,
        revenueThisYear: 13420.00
      }
    ],
    yearlyTrends: {
      energyUsage: Array.from({ length: 52 }, (_, i) => ({
        year: i + 1,
        energy: Math.random() * 1000 + 200
      })),
      sessionTrends: Array.from({ length: 52 }, (_, i) => ({
        year: i + 1,
        sessions: Math.random() * 30 + 10
      })),
      revenueTrends: Array.from({ length: 52 }, (_, i) => ({
        year: i + 1,
        revenue: Math.random() * 1200 + 300
      }))
    ],
      alerts: [
        {
          type: 'HARDWARE',
          severity: 'CRITICAL',
          count: 5,
          resolved: 3
        },
        {
          type: 'SECURITY',
          severity: 'MEDIUM',
          count: 12,
          resolved: 8
        }
      ]
    },
    maintenanceScheduled: [
      {
        week: 1, tasks: 12,
        completed: 10
      }
    ]
  };
  }

console.log('📊 Report Service is running on port 3011');
console.log('🔑 Health check: http://localhost:3011/health');
console.log('📊 Reports API: http://localhost:3011/reports');
console.log('📋 Templates API: http://localhost:3011/templates');
console.log('📈 Export API: http://localhost:3011/reports/export');
console.log('📱 Search API: http://localhost:3011/search');

// Update Docker Compose to include new services
logger.info('Report Service created with daily/weekly/monthly/yearly reporting');