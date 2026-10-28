import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config/index.js';
import { connectDB, isDbConnected } from './config/db.js';
import { initializeGraphService } from './services/graphService.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import incidentRoutes from './routes/incidents.js';
import roadRoutes from './routes/roads.js';
import ambulanceRoutes from './routes/ambulances.js';
import hospitalRoutes from './routes/hospitals.js';
import routeRoutes from './routes/routes.js';
import dispatchRoutes from './routes/dispatch.js';
import indexDemoRoutes from './routes/indexDemo.js';
import analyticsRoutes from './routes/analytics.js';
import auditRoutes from './routes/audit.js';
import scenarioRoutes from './routes/scenario.js';
import eventsRoutes from './routes/events.js';
import notificationsRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';

// Model imports for health check
import {
  User,
  RoadNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Incident
} from './models/index.js';

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
if (config.env === 'development') {
  app.use(morgan('dev'));
}

// Academic simulation header
app.use((req, res, next) => {
  res.setHeader('X-System-Engine', 'ResQNet-Enterprise-Routing');
  next();
});

// System health check
app.get('/api/health', async (req, res) => {
  const dbStatus = isDbConnected() ? 'CONNECTED' : 'DISCONNECTED';
  try {
    const summary = {
      status: 'ONLINE',
      mode: 'Emergency Operations Command & Fleet Routing Platform',
      database: dbStatus,
      counts: {
        users: await User.countDocuments(),
        nodes: await RoadNode.countDocuments({ scenario: { $ne: 'city-dense' } }),
        totalNodes: await RoadNode.countDocuments(),
        edges: await RoadEdge.countDocuments({ scenario: { $ne: 'city-dense' } }),
        totalEdges: await RoadEdge.countDocuments(),
        ambulances: await Ambulance.countDocuments({ scenario: { $ne: 'city-dense' } }),
        hospitals: await Hospital.countDocuments({ scenario: { $ne: 'city-dense' } }),
        incidents: await Incident.countDocuments({ scenario: { $ne: 'city-dense' } })
      },
      timestamp: new Date()
    };
    res.json(summary);
  } catch (err) {
    res.status(503).json({
      status: 'DEGRADED',
      database: dbStatus,
      error: err.message
    });
  }
});

// Mount REST API routers
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/roads', roadRoutes);
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/lab', routeRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/index', indexDemoRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/scenario', scenarioRoutes);
app.use('/api/admin/scenario', scenarioRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', userRoutes);

// Catch-all 404 for unmapped API endpoints
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: `API Endpoint not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// Centralized error handler
app.use(errorHandler);

// Server startup
let server = null;
export async function startServer(port = config.port) {
  try {
    await connectDB();
    await initializeGraphService();

    server = app.listen(port, () => {
      console.log(`\n====================================================`);
      console.log(`  ResQNet API Server running on port ${port}       `);
      console.log(`  Health Check: http://localhost:${port}/api/health `);
      console.log(`  Mode: Emergency Operations Command Platform           `);
      console.log(`====================================================\n`);
    });
    return server;
  } catch (err) {
    console.error(`[ResQNet Startup Error]`, err);
    process.exit(1);
  }
}

// Auto-start if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;
