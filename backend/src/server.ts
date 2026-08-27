import 'dotenv/config';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const app = createApp();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`MAPS Asesores API listening on 0.0.0.0:${env.PORT}`);
});
