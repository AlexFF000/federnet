import fastify from 'fastify';
import * as dotenv from 'dotenv';

dotenv.config({ path: './infrastructure_server/.env' });

import log from './log.js';
import { MongoConnection } from './repository/MongoConnection.js';
import { KeypairSingleton } from './KeypairSingleton.js';
import accountRoutes from './route/accountRoutes.js';
import communityRoutes from './route/communityRoutes.js';

// Validate environment vars
const port: number = process.env.PORT != undefined && !isNaN(parseInt(process.env.PORT))
    ? parseInt(process.env.PORT)
    : 24401;  // Use port 24401 if none specified in env vars

// Generate keypair if it doesn't already exist
await KeypairSingleton.getInstance();
// Connect to MongoDb
await MongoConnection.getInstance();

// Start HTTP server
log.info(`Starting server on port: ${port}`);

const server = fastify();

server.register(accountRoutes);
server.register(communityRoutes);

server.listen({ port: port });
