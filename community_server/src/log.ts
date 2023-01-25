/*
    Setup for logging
*/
import pino from 'pino';
import * as dotenv from 'dotenv';

dotenv.config({ path: './community_server/.env'});

const tranport = pino.transport({
    targets: [{
        level: 'trace',
        target: 'pino-pretty',
        options: {destination: 1} // 1 == stdout
    },
    {
        level: 'trace',
        target: 'pino-pretty',
        options: {destination: `${process.env.LOG_PATH}/main.log`, mkdir: true}
    }
]
})
export default pino(tranport)