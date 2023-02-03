/*
    Handler for responding to GetInfrastructureServerPublicKey requests
*/

import { FastifyInstance, FastifyPluginOptions } from "fastify";

import { RESPONSE_CODES } from "../constants.js";
import { KeypairSingleton } from "../KeypairSingleton.js";
import log from "../log.js";
import Response from "../model/Response.js";

const publicKeyEndpoint = "/publicKey";

export default (server: FastifyInstance , opts: FastifyPluginOptions, done: CallableFunction) => {
    server.get(publicKeyEndpoint, async (req, res) => {
        log.debug("Received GetInfrastructureServerPublicKey request");

        res.code(200);  // 200 Ok
        let keypair = await KeypairSingleton.getInstance();
        res.send(new Response(RESPONSE_CODES.Success, "Successfully fetched public key", [
            keypair.publicKey.export({
                format: "pem",
                type: "spki"
            })
        ]));
    });

    done();
}