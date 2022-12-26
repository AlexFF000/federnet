/*
    Routes for account related functionality
*/

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Static, Type } from '@sinclair/typebox';

import log from '../log.js';
import Account from '../model/Account.js';
import Response from '../model/Response.js';
import * as accountService from '../service/accountService.js';
import { RESPONSE_CODES } from '../constants.js';

const accountsEndpoint : string = "/accounts";
const sessionsEndpoint = "/sessions";

const usernameAndPasswordAccountBody = Type.Object({
    username: Type.String(),
    password: Type.String()
});
const publicKeyBody = Type.Object({
    public_key: Type.String()
});
const usernameParam = Type.Object({
    username: Type.String()
})

const bearerRegex = new RegExp("^Bearer ");

export default (server: FastifyInstance , opts: FastifyPluginOptions, done: CallableFunction) => {
    server.withTypeProvider<TypeBoxTypeProvider>()

    // CreateAccount
    server.post<{Body: Static<typeof usernameAndPasswordAccountBody>}>(accountsEndpoint, {
        schema: {
            body: usernameAndPasswordAccountBody
        }
    }, async (req, res) => {
        log.debug("Received CreateAccount request");
        let account: Account = new Account(req.body.username);
        account.password = req.body.password;

        let result = await accountService.createAccount(account);

        let response: Response;
        switch (result) {
            case "Success":
                response = new Response(RESPONSE_CODES.Success, "Account created successfully");
                res.code(200);
                break;
            case "UsernameNotUnique":
                response = new Response(RESPONSE_CODES.UsernameNotUnique, "Username is not unique");
                res.code(409);
                break;
            case "UnsuitablePassword":
                response = new Response(RESPONSE_CODES.UnsuitablePassword, "Password does not meet complexity requirements: Must be at least 8 characters, consisting of upper and lowercase letters, numbers, and special characters");
                res.code(403);
                break;
            default:
                response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while creating account");
                res.code(500);

        }
        res.send(response);
        log.debug(`Sent response ${response.code} for CreateAccount request`);
    });

    // GetSession
    server.post<{Body: Static<typeof usernameAndPasswordAccountBody>}>(sessionsEndpoint, {
        schema: {
            body: usernameAndPasswordAccountBody
        }
    }, async (req, res) => {
        log.debug("Received GetSession request");
        let account: Account = new Account(req.body.username);
        account.password = req.body.password;

        let result = await accountService.getSession(account);

        let response: Response;
        switch (result) {
            case "BadCredentials":
                response = new Response(RESPONSE_CODES.BadCredentials, "Incorrect username or password");
                res.code(401);
                break;
            case "GenericFailure":
                response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while getting session");
                res.code(500);
                break;
            default:
                response = new Response(RESPONSE_CODES.Success, "Log in successful", [
                    result
                ]);
                res.code(200);
        }
        res.send(response);
        log.debug(`Sent response ${response.code} for GetSession request`);
    });

    // SetPublicKey
    server.put<{Body: Static<typeof publicKeyBody>}>(`${accountsEndpoint}/:username`, {
        schema: {
            body: publicKeyBody
        }
    }, async (req, res) => {
        log.debug("Received SetPublicKey request");
        let response: Response;
        // Check that authorization header is provided
        if (req.headers.authorization === undefined || !bearerRegex.test(req.headers.authorization)) {
            response = new Response(RESPONSE_CODES.UnauthorisedUserRequest, "User is not authorised");
            res.code(401);
        } else {
            // Extract token part of authorization header (i.e. remove the bit that says "Bearer ")
            let token = req.headers.authorization.substring(7);
            let payload = await accountService.verifySession(token);
            if (typeof payload !== "boolean") {
                // Token is legitimate
                let account = new Account(payload.username);
                account.publicKey = req.body.public_key;
                let result = await accountService.setPublicKey(account);

                if (result === "Success") {
                    response = new Response(RESPONSE_CODES.Success, "Successfully set public key");
                    res.code(200);
                } else {
                    response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while setting public key");
                    res.code(500);
                }

            } else {
                response = new Response(RESPONSE_CODES.UnauthorisedUserRequest, "User is not authorised");
                res.code(401);
            }
        }

        res.send(response);
        log.debug(`Sent response ${response.code} for SetPublicKey request`);
    });

    //GetPublicKey
    server.get<{Params: Static<typeof usernameParam>}>(`${accountsEndpoint}/:username`, async (req, res) => {
        log.debug("Received GetPublicKey request");
        let username = req.params.username;

        let result = await accountService.getPublicKey(username);

        let response: Response;
        switch (result) {
            case "UserNotFound":
                response = new Response(RESPONSE_CODES.UserNotFound, "No user found with the specified name");
                res.code(404);
                break;
            case "NoPublicKey":
                response = new Response(RESPONSE_CODES.NoPublicKey, "The specified user has not set up a public key");
                res.code(404);
                break;
            default:
                response = new Response(RESPONSE_CODES.Success, "Fetched public key", [
                    result
                ]);
                res.code(200);
        }

        res.send(response);
        log.debug(`Sent response ${response.code} for GetPublicKey request`);
    });

    done();
}