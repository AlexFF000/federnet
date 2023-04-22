/*
    Entry point for Community Server application
*/
import fastify from 'fastify';
import { readFileSync } from "fs";

import * as dotenv from 'dotenv';
dotenv.config({ path: './community_server/.env'});

import log from "./log.js";
import { KeypairSingleton } from "./KeypairSingleton.js";
import { MongoConnection } from "./repository/MongoConnection.js";
import pingRoute from './route/pingRoute.js';
import postRoutes from './route/postRoutes.js';
import { startCLI } from './managementShell.js';
import { InfrastructureServerPublicKeySingleton } from './InfrastructureServerPublicKeySingleton.js';

// Validate environment vars
const port: number = process.env.PORT != undefined && !isNaN(parseInt(process.env.PORT))
    ? parseInt(process.env.PORT)
    : 24402;  // Use port 24402 if none specified in env vars

if (process.env.SSL_CERT_FILE === undefined || typeof process.env.SSL_CERT_FILE !== "string" || process.env.SSL_CERT_FILE === "") {
    log.fatal("No SSL certificate file path provided in SSL_CERT_FILE environment variable");
    process.exit(1);
}
if (process.env.SSL_KEY_FILE === undefined || typeof process.env.SSL_KEY_FILE !== "string" || process.env.SSL_KEY_FILE === "") {
    log.fatal("No private key file path provided in SSL_KEY_FILE environment variable");
    process.exit(1);
}

if (process.env.INFRASTRUCTURE_SERVER_ADDRESS !== undefined) {
    try {
        new URL(process.env.INFRASTRUCTURE_SERVER_ADDRESS);  // TypeError will be thrown if this isn't in a valid address format
    } catch (e) {
        log.fatal("Address provided in INFRASTRUCTURE_SERVER_ADDRESS is not in a valid URL format");
        process.exit(1);
    }
} else {
    log.fatal("No address provided in INFRASTRUCTURE_SERVER_ADDRESS environment variable");
    process.exit(1);
}

// Generate keypair if it doesn't already exist
await KeypairSingleton.getInstance();
// Fetch Infrastructure Server's public key
await InfrastructureServerPublicKeySingleton.getInstance();
// Connect to MongoDb
await MongoConnection.getInstance();

// Start HTTP server
log.info(`Starting server on port: ${port}`);

const server = fastify({
    https: {
        key: readFileSync(process.env.SSL_KEY_FILE),
        cert: readFileSync(process.env.SSL_CERT_FILE)
    }
});

server.register(pingRoute);
server.register(postRoutes);

server.listen({ port: port, host: "0.0.0.0" });

await startCLI();
