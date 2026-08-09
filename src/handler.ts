import dotenv from 'dotenv';
import path from 'node:path';
import serverless from 'serverless-http';
import { createApp } from './app.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const handler = serverless(createApp());
