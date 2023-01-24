/*
    Routes for community related functionality
*/

import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Static, Type } from '@sinclair/typebox';
import { FastifyInstance, FastifyPluginOptions, FastifyReply, FastifyRequest, HookHandlerDoneFunction } from 'fastify';
import { RESPONSE_CODES } from '../constants.js';

import log from '../log.js';
import Community from '../model/Community.js';
import Response from '../model/Response.js';
import * as communityService from '../service/communityService.js';

const communitiesEndpoint: string = "/communities";

const communityAllFieldsBody = Type.Object({
    name: Type.String(),
    description: Type.String(),
    address: Type.String(),
    publicKey: Type.String()
});

const updateCommunityBody = Type.Object({
    name: Type.Optional(Type.String()),
    description: Type.Optional(Type.String()),
    address: Type.Optional(Type.String()),
    publicKey: Type.Optional(Type.String()),
    timestamp: Type.Integer(),
    signature: Type.String()
});

const communityNameParam = Type.Object({
    communityName: Type.String()
})

export default (server: FastifyInstance, opts: FastifyPluginOptions, done: CallableFunction) => {
    server.withTypeProvider<TypeBoxTypeProvider>();

    // RegisterCommunity
    server.post<{Body: Static<typeof communityAllFieldsBody>}>(communitiesEndpoint, {
        schema: {
            body: communityAllFieldsBody
        }
    }, async (req, res) => {
        log.debug("Received RegisterCommunity request");
        let response: Response;

        try {
            let community: Community = new Community();
            community.name = req.body.name;
            community.description = req.body.description;

            // Use URL class to check if the URL is in a valid format, otherwise TypeError will be thrown
            community.address = new URL(req.body.address).toString();
            community.publicKey = req.body.publicKey;

            let result: string = await communityService.registerCommunity(community);

            switch (result) {
                case "CommunityNameNotUnique":
                    response = new Response(RESPONSE_CODES.CommunityNameNotUnqiue, "Community name is not unique");
                    res.code(409);
                    break;
                case "UnsuitableAddress":
                    response = new Response(RESPONSE_CODES.UnsuitableAddress, "The server at the given address failed to identify itself as a Federnet community server");
                    res.code(403);
                    break;
                case "Success":
                    response = new Response(RESPONSE_CODES.Success, "Successfully registered community");
                    res.code(200);
                    break;
                default:
                    response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while registering community");
                    res.code(500);
            }
        } catch (e) {
            if (e instanceof TypeError) {
                // The address isn't a valid URL
                response = new Response(RESPONSE_CODES.UnsuitableAddress, "The server at the given address failed to identify itself as a Federnet community server");
                res.code(403);
            } else {
                response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while registering community");
                res.code(500);
            }
        }

        res.send(response);
    });

    // UpdateCommunity
    server.patch<{Params: Static<typeof communityNameParam>, Body: Static<typeof updateCommunityBody>}>(`${communitiesEndpoint}/:communityName`, 
    {
        schema: {
            body: updateCommunityBody
        },
        preHandler: authoriseCommunityRequest  // Verify signature before running handler
    },
    async (req, res) => {
        let community = new Community();
        if (req.body.name !== undefined) community.name = req.body.name;
        if (req.body.description !== undefined) community.description = req.body.description;
        if (req.body.address !== undefined) community.address = req.body.address;
        if (req.body.publicKey !== undefined) community.publicKey = req.body.publicKey;

        let result: string = await communityService.updateCommunity(req.params.communityName, community);
        let response: Response;
        switch(result) {
            case "CommunityNameNotUnique":
                response = new Response(RESPONSE_CODES.CommunityNameNotUnqiue, "Community name is not unique");
                res.code(409);
                break;
            case "UnsuitableAddress":
                response = new Response(RESPONSE_CODES.UnsuitableAddress, "The server at the given address failed to identify itself as a Federnet community server");
                res.code(403);
                break;
            case "Success":
                response = new Response(RESPONSE_CODES.Success, "Successfully updated community info");
                res.code(200);
                break;
            default:
                response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while updating community info");
                res.code(500);
        }

        res.send(response);
    });

    // GetCommunityInfo
    server.get<{Params: Static<typeof communityNameParam>}>(`${communitiesEndpoint}/:communityName`, async (req, res) => {
        let communityName = decodeURIComponent(req.params.communityName);
        let community = await communityService.getCommunity(communityName);

        let response: Response;
        if (community !== null) {
            response = new Response(RESPONSE_CODES.Success, "Got community info", [
                community
            ]);
            res.code(200);
        } else {
            response = new Response(RESPONSE_CODES.CommunityNotFound, "No community found with specified name");
            res.code(404);
        }

        res.send(response);
    });

    // RemoveCommunity
    server.delete<{Params: Static<typeof communityNameParam>, Body: Static<typeof updateCommunityBody>}>(`${communitiesEndpoint}/:communityName`, {
        preHandler: authoriseCommunityRequest
    }, async (req, res) => {
        let communityName = decodeURIComponent(req.params.communityName);
        
        let response: Response;
        if (await communityService.removeCommunity(communityName) === "Success") {
            response = new Response(RESPONSE_CODES.Success, "Successfully removed community");
            res.code(200);
        } else {
            response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while removing community");
            res.code(500);
        }

        res.send(response);
    });

    // FetchCommunties
    server.get(communitiesEndpoint, async (req, res) => {
        let communities: Community[] = await communityService.fetchCommunities();
        res.code(200);
        res.send(new Response(RESPONSE_CODES.Success, "Fetched communties list", communities));
    });

    done();
}

async function authoriseCommunityRequest(req: FastifyRequest<{Params: Static<typeof communityNameParam>, Body: Static<typeof updateCommunityBody>}>, res: FastifyReply, done: HookHandlerDoneFunction) {
    // Verify signature is valid

    /*
        To ensure the hashes match, the body fields must be combined into a string exactly as required by the specification
            - The entries must be ordered (ascending) by the sum of the Unicode numerical representations of each character in the keyname
            - The entries must be combined into a string in the following format:
                "<key name>:<entry value>,<key name>:<entry value>"
    */
    let sortedKeyNames = Object.keys(req.body).sort();  // JS' sort function sorts strings by UTF-16 values rather than UTF-8 but this is fine for our purposes
    let entries = Object.entries(req.body);
    let bodyString = "";
    for (let i in sortedKeyNames) {
        let key = sortedKeyNames[i];
        if (key !== "signature") {  // The signature field must not be included in the string
            // If not the first entry, then prefix with a comma to separate from the previous entry
            if (bodyString !== "") {
                bodyString += ",";
            }
            let entry = entries.find(element => element[0] === key);
            if (entry !== undefined) bodyString += `${key}:${entry[1]}`;
        }
    }

    let communityName = decodeURIComponent(req.params.communityName);  // Some characters might be in HTML encoding as name is passed in the URL
    // Check if the signature matches
    let result = await communityService.verifySignature(communityName, bodyString, req.body.signature);
    let currentTimestamp = Math.floor(Date.now() / 1000);
    if (result === "UnauthorisedCommunityRequest" || result === "GenericFailure") {
        // Signature failed verification so send unauthorised response and prevent further handlers running
        res.code(401);
        res.send(new Response(RESPONSE_CODES.UnauthorisedCommunityRequest, "Failed to verify signature"));
        res.hijack();  // Stop further handler running
    } else if (result === "CommunityNotFound") {
        // No community found with the given name
        res.code(404);
        res.send(new Response(RESPONSE_CODES.CommunityNotFound, "No community found with the specified name"));
        res.hijack();
    } else if (60 < Math.abs(currentTimestamp - req.body.timestamp)) { // If request timestamp is more than 60 seconds old the request is stale
        res.code(403);
        res.send(new Response(RESPONSE_CODES.StaleRequest, "Request timestamp is too old"));
        res.hijack();
    }
    
    // Just return instead of calling done(), otherwise handler will run twice (seems to be strange behaviour with fastify when mixing async and callbacks in hooks)
    return;
}