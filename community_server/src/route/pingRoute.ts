import { FastifyInstance, FastifyPluginOptions } from "fastify";

import { RESPONSE_CODES } from "../constants.js";
import log from "../log.js";
import Response from "../model/Response.js";

/*
    Handler for responding to ping requests
*/
const pingEndpoint = "/ping";

export default (server: FastifyInstance , opts: FastifyPluginOptions, done: CallableFunction) => {
    server.get(pingEndpoint, async (req, res) => {
        log.debug("Received ping request");
        res.code(200);  // 200 Ok
        res.send(new Response(RESPONSE_CODES.Success, "Pong"));
    });

    done();
}