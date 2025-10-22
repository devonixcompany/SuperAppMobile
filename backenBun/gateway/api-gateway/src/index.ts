import { createGateway } from './routes/index.js';

const app = await createGateway();

app.listen(3000);

console.log('🚀 API Gateway is running on port 3000');
console.log('📊 Health check: http://localhost:3000/health');
console.log('🔍 Services: http://localhost:3000/services');