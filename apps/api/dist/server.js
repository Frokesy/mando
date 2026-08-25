import 'dotenv/config';
import { buildApp } from './app.js';
import { deliverPendingPushNotifications } from './push/delivery.js';
const host = process.env.API_HOST ?? (process.env.NODE_ENV === 'production' ? '::' : '127.0.0.1');
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
const app = buildApp({ webOrigin });
try {
    await app.listen({ host, port });
    const deliverPush = () => {
        void deliverPendingPushNotifications().catch((error) => app.log.error(error, 'Push delivery cycle failed'));
    };
    deliverPush();
    const pushInterval = setInterval(deliverPush, 10_000);
    pushInterval.unref();
}
catch (error) {
    app.log.error(error);
    process.exit(1);
}
