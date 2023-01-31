/*
    Setup for logging
*/
import pino from 'pino';
import * as dotenv from 'dotenv';

dotenv.config({ path: './community_server/.env'});

const tranport = pino.transport({
    targets: [
    {
        level: 'trace',
        target: 'pino-pretty',
        options: {destination: `${process.env.LOG_PATH}/main.log`, mkdir: true}
    },
    {
        level: "fatal",  // Only show fatal log entries in the console to avoid log messages getting in the way of the CLI
        target: 'pino-pretty',
        options: {destination: 1}  // 1 == stdout
    }
]
})
export default pino(tranport)