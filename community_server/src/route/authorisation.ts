/*
    Handler to verify the user's JWT
*/

import { Static, Type } from "@sinclair/typebox";
import { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";

import { RESPONSE_CODES } from "../constants.js";
import * as infrastructureServerService from "../service/infrastructureServerService.js";
import Response from "../model/Response.js";

export const authHeader = Type.Object({
    "Authorization": Type.String()
});

/* 
    This is a hacky way of passing the username from the JWT token to the normal route handler.  
    The correct way to do it is to add a username field to the Fastify req object, but TypeScript won't allow this.
    So the best we can do is define the Params object with this optional field and put the username into it later 
*/
export const tokenUsernameParam = Type.Object({  
    "tokenUsername": Type.Optional(Type.String())
});

const bearerRegex = new RegExp("^Bearer ");

export async function authoriseRequestJwt(req: FastifyRequest<{Headers: Static<typeof authHeader>, Params: Static<typeof tokenUsernameParam>}>, res: FastifyReply, done: HookHandlerDoneFunction) {
    // Check that the Authorization header contains a JWT token in the Bearer format
    if (req.headers.authorization !== undefined && bearerRegex.test(req.headers.authorization)) {
        // Extract the token part of the authorization header (i.e. remove the bit that says "Bearer ")
        let token = req.headers.authorization.substring(7);
        let payload = await infrastructureServerService.verifyToken(token);
        if (payload !== false) {
            // Token is legitimate
            req.params.tokenUsername = payload.username;
        } else {
            res.code(401);  // 401 Unauthorized
            res.send(new Response(RESPONSE_CODES.UnauthorisedUserRequest, "User is not authorised"));
            res.hijack();  // Prevent further handlers from running
        }
    } else {
        res.code(401);  // 401 Unauthorized
        res.send(new Response(RESPONSE_CODES.UnauthorisedUserRequest, "User is not authorised"));
        res.hijack();  // Prevent further handlers from running
    }

    // Just return instead of calling done(), otherwise handler will run twice (seems to be strange behaviour with fastify when mixing async and callbacks in hooks)
    return;
}