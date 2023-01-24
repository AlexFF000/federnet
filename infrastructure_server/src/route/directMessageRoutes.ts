/*
    Routes for direct message related functionality
*/

import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Static, Type } from '@sinclair/typebox';
import { FastifyInstance, FastifyPluginOptions } from "fastify";

import { authHeader, authoriseAccountRequest, tokenUsernameParam } from "./accountAuthorisation.js";
import * as directMessageService from "../service/directMessageService.js";
import DirectMessage from "../model/DirectMessage.js";
import Response from "../model/Response.js";
import { RESPONSE_CODES } from "../constants.js";

const directMessagesEndpoint = "/DirectMessages";

const sendDirectMessageBody = Type.Object({
    recipientUsername: Type.String(),
    content: Type.String()
});

const fetchDirectMessagesHeaders = Type.Object({
    "Authorization": Type.String(),
    "start-time": Type.Integer(),
    "end-time": Type.Optional(Type.Integer())
});


export default (server: FastifyInstance , opts: FastifyPluginOptions, done: CallableFunction) => {
    server.withTypeProvider<TypeBoxTypeProvider>();

    // SendDirectMessage
    server.post<{Body: Static<typeof sendDirectMessageBody>, Headers: Static<typeof authHeader>, Params: Static<typeof tokenUsernameParam>}>(directMessagesEndpoint,
        {
            preHandler: authoriseAccountRequest
        }, async (req, res) => {
            let senderUsername = "";
            if (req.params.tokenUsername) senderUsername = req.params.tokenUsername;  // Always true, just here to satisfy TypeScript
            let message = new DirectMessage(senderUsername, req.body.recipientUsername, req.body.content, Math.floor(Date.now() / 1000));
            let result = await directMessageService.sendDirectMessage(message);

            let response: Response;
            switch (result) {
                case "Success":
                    res.code(200);
                    response = new Response(RESPONSE_CODES.Success, "Successfully sent Direct Message");
                    break;
                case "UserNotFound":
                    res.code(403);
                    response = new Response(RESPONSE_CODES.UserNotFound, "No recipient found with the specified name");
                    break;
                case "NoPublicKey":
                    res.code(403);
                    response = new Response(RESPONSE_CODES.NoPublicKey, "The specified user has not set up a public key, and so cannot receive direct messages");
                    break;
                default:
                    res.code(500);
                    response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while adding Direct Message");  
            }
            
            res.send(response);
    });

    // FetchDirectMessages
    server.get<{Headers: Static<typeof fetchDirectMessagesHeaders>, Params: Static<typeof tokenUsernameParam>}>(directMessagesEndpoint,
        {
            preHandler: authoriseAccountRequest
        }, async (req, res) => {
            // If no End-Time provided, use current timestamp
            let endTime: number;
            if (req.headers["end-time"] !== undefined) endTime = req.headers["end-time"];
            else endTime = Math.floor(Date.now() / 1000);

            let username = "";
            if (req.params.tokenUsername) username = req.params.tokenUsername;  // Always true.  Just here to satisfy TypeScript (see authoriseAccountRequest() for more details)
            let messages = await directMessageService.fetchDirectMessages(username, req.headers["start-time"], endTime);

            res.code(200);
            res.send(new Response(RESPONSE_CODES.Success, "Successfully fetched direct messages", messages));
    });

    done();
}