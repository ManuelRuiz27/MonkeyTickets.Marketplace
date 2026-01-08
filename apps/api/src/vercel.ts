import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApplication } from './bootstrap';

let serverPromise: Promise<(req: VercelRequest, res: VercelResponse) => unknown> | null = null;

async function getServer() {
    if (!serverPromise) {
        serverPromise = (async () => {
            const { app } = await createApplication();
            return app.getHttpAdapter().getInstance();
        })();
    }

    return serverPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const server = await getServer();
    return server(req, res);
}
