import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRouter from './routes/index.js';
const app = express();
const port = Number(process.env.PORT || 4000);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(morgan('dev'));
app.use('/api', apiRouter);
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Серверда ички хатолик юз берди' });
});
app.listen(port, () => console.log(`Golden Key OS API: http://localhost:${port}`));
