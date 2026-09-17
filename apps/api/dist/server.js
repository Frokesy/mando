import 'dotenv/config';
import { buildApp } from './app.js';
import { deliverPendingPushNotifications } from './push/delivery.js';
import { startSalesAgentPostReminderScheduler } from './notifications/sales-agent-post-reminder.js';
import { ensureDatabaseConnection } from './db/client.js';
const host = process.env.API_HOST ?? (process.env.NODE_ENV === 'production' ? '::' : '127.0.0.1');
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
const app = buildApp({ webOrigin });
try {
    await ensureDatabaseConnection();
    await app.listen({ host, port });
    const runBackgroundJobs = process.env.ENABLE_BACKGROUND_JOBS !== 'false'
        && (process.env.NODE_ENV === 'production' || process.env.ENABLE_BACKGROUND_JOBS === 'true');
    if (runBackgroundJobs) {
        const deliverPush = () => {
            void deliverPendingPushNotifications(app.log).catch((error) => app.log.error(error, 'Push delivery cycle failed'));
        };
        deliverPush();
        const pushInterval = setInterval(deliverPush, 10_000);
        pushInterval.unref();
        startSalesAgentPostReminderScheduler((error) => {
            app.log.error(error, 'Sales-agent post reminder scheduler failed');
        });
    }
    else {
        app.log.info('Background notification jobs are disabled for local development');
    }
}
catch (error) {
    app.log.error(error);
    process.exit(1);
}
