import { Db, MongoClient } from "mongodb";
import * as dotenv from 'dotenv';

dotenv.config({ path: './../community_server/.env'});

import log from './../log.js';

/*
    Singleton for holding and managing the connection to the MongoDB database
*/
class MongoConnection {
    static instance: MongoConnection;

    client!: MongoClient;
    database!: Db;

    private constructor() {
        
    }

    static async getInstance(): Promise<MongoConnection> {
        if (MongoConnection.instance == undefined) {
            // Create new instance
            MongoConnection.instance = new MongoConnection();
            await MongoConnection.instance.start();
            return MongoConnection.instance;
        } else {
            // The MongoConnection has already been instatiated, just return it
            return MongoConnection.instance;
        }
    }

    private async start(): Promise<void> {
        log.info("Attempting to connect to MongoDB");

        // Validate envvars
        if (process.env.DB_CONN_STRING == undefined || process.env.DB_CONN_STRING == '') {
            log.fatal("No database connection string provided in DB_CONN_STRING environment variable");
            process.exit(1);
        }
        if (process.env.DB_NAME == undefined || process.env.DB_NAME == '') {
            log.fatal("No database name provided in DB_NAME environment variable");
            process.exit(1);
        }

        try {
            this.client = new MongoClient(process.env.DB_CONN_STRING);
            // Establish connection to MongoDB
            await this.client.connect();
            // Use correct database
            this.database = this.client.db(process.env.DB_NAME);

            // Test connection
            await this.database.command( {ping: 1 });

            log.info("Connected to MongoDB database");
        } catch (e) {
            log.fatal(e, `Failed to connect to MongoDB database: ${process.env.DB_NAME}`);
            process.exit(1);
        }
    }

}

export { MongoConnection };