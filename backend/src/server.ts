import { createApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`MAPS Asesores API listening on http://localhost:${env.PORT}`);
});
