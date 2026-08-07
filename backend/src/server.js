import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import apiRouter from './routes/index.js';
import bankOffersRouter from './routes/bank-offers.js';
import banksRouter from './routes/banks.js';
import telegramRouter from './routes/telegram.js';
import usersRouter from './routes/users.js';
import branchesRouter from './routes/branches.js';

const app = express();
const port = Number(process.env.PORT || 4000);

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const corsOptions = {
  origin(origin, callback) {
    /*
      Postman, Railway ички сўровлари ёки сервердан серверга
      сўровларда origin бўлмаслиги мумкин.
    */
    if (!origin) {
      return callback(null, true);
    }

    /*
      CORS_ORIGIN киритилмаган бўлса, вақтинча барча origin'ларга
      рухсат берилади.
    */
    if (allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS рухсат бермади: ${origin}`),
      false
    );
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],
};

/* =========================================================
   MIDDLEWARE
========================================================= */

app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(cors(corsOptions));

app.use(
  express.json({
    limit: '15mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '15mb',
  })
);

app.use(morgan('dev'));

/* =========================================================
   PUBLIC ROUTES
========================================================= */

app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    name: 'Golden Key OS API',
    version: '0.4.0',
    message: 'Golden Key OS backend ишлаяпти',
    endpoints: {
      api: '/api',
      health: '/api/health',
      bankOffers: '/api/bank-offers',
      banks: '/api/banks',
      telegram: '/api/telegram',
      users: '/api/users',
      branches: '/api/branches',
    },
  });
});

/* =========================================================
   API ROUTES
========================================================= */

/*
  Мавжуд маршрутлар:
  /api/health
  /api/auth/login
  /api/auth/me
  /api/cases
  ва бошқалар
*/

app.use('/api', apiRouter);

/*
  Алоҳида API маршрутлар
*/

app.use('/api/bank-offers', bankOffersRouter);
app.use('/api/banks', banksRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/users', usersRouter);
app.use('/api/branches', branchesRouter);

/* =========================================================
   404 HANDLER
========================================================= */

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Маршрут топилмади',
    method: req.method,
    path: req.originalUrl,
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error('Сервер хатоси:', error);

  if (res.headersSent) {
    return next(error);
  }

  if (error.message?.startsWith('CORS рухсат бермади')) {
    return res.status(403).json({
      ok: false,
      error: error.message,
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      ok: false,
      error: 'Юборилган маълумот ҳажми жуда катта',
    });
  }

  return res.status(error.status || 500).json({
    ok: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Серверда ички хатолик юз берди'
        : error.message || 'Серверда ички хатолик юз берди',
  });
});

/* =========================================================
   SERVER START
========================================================= */

const server = app.listen(port, '0.0.0.0', () => {
  console.log('========================================');
  console.log('Golden Key OS API ишга тушди');
  console.log(`PORT: ${port}`);
  console.log(`ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
});

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

function shutdown(signal) {
  console.log(`${signal} қабул қилинди. Сервер тўхтатилмоқда...`);

  server.close((error) => {
    if (error) {
      console.error(
        'Серверни тўхтатишда хато:',
        error
      );

      process.exit(1);
    }

    console.log('Сервер тўхтатилди.');
    process.exit(0);
  });
}

process.on(
  'SIGTERM',
  () => shutdown('SIGTERM')
);

process.on(
  'SIGINT',
  () => shutdown('SIGINT')
);