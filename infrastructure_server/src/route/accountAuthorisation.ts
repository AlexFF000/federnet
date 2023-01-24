/*
    Handlers for verifying and checking account auth tokens
*/

import { Static, Type } from "@sinclair/typebox";
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";
import { RESPONSE_CODES } from "../constants.js";

import Response from "../model/Response.js";
import * as accountService from '../service/accountService.js';

export const authHeader = Type.Object({
    "Authorization": Type.String()
});

export const tokenUsernameParam = Type.Object({
    "tokenUsername": Type.Optional(Type.String())
});

const bearerRegex = new RegExp("^Bearer ");

export async function authoriseAccountRequest(req: FastifyRequest<{Headers: Static<typeof authHeader>, Params: Static<typeof tokenUsernameParam>}>, res: FastifyReply, done: HookHandlerDoneFunction) {
    // Check that authorization header is provided
    if (req.headers.authorization === undefined || !bearerRegex.test(req.headers.authorization)) {
        res.code(401);
        res.send(new Response(RESPONSE_CODES.UnauthorisedUserRequest, "User is not authorised"));
        res.hijack();  // Prevent further handlers running
        
    } else {
        // Extract token part of authorization header (i.e. remove the bit that says "Bearer ")
        let token = req.headers.authorization.substring(7);
        let payload = await accountService.verifySession(token);
        if (typeof payload !== "boolean") {
            // Token is legitimate
            /*
                The correct way to pass the username into the handler would be to use fastify's decorateRequest method to add a custom username field to the request object
                However, using Typescript with Fastify makes this tricky since the custom field isn't listed in the FastifyRequest type definition
                So we alter the params object instead.  This is a bit dirty, but shouldn't cause any problems
            */
            req.params.tokenUsername = payload.username;
        } else {
            // Token is illegitimate
            res.code(401);
            res.send(new Response(RESPONSE_CODES.UnauthorisedUserRequest, "User is not authorised"));
            res.hijack();  // Prevent further handlers running
        }
    }

    // Just return instead of calling done(), otherwise handler will run twice (seems to be strange behaviour with fastify when mixing async and callbacks in hooks)
    return;
}