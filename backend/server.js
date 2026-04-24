const app = require('./app');

const PORT = process.env.BACKEND_PORT || 5000;

app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Backend server running on port ${PORT}`);
  console.log('API Documentation:');
  console.log('  Applications: GET /api/applications');
  console.log('  Connections: GET /api/connections/app/:appId');
  console.log('  Test Connection: POST /api/connections/:connectionId/test');
  console.log('  Health: GET /api/health');
});
