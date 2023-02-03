/*
    Logic for functionality relating to the Infrastructure Server
*/
import jsonwebtoken from 'jsonwebtoken';
import axios from 'axios';
import { createSign } from 'crypto';

import * as dotenv from 'dotenv';
dotenv.config({ path: './community_server/.env'});

import log from "../log.js";
import { IJwtPayload } from "../model/IJwtPayload.js";
import { RESPONSE_CODES } from '../constants.js';
import { KeypairSingleton } from '../KeypairSingleton.js';
import { ICommunityBody } from '../model/ICommunityBody.js';
import { InfrastructureServerPublicKeySingleton } from '../InfrastructureServerPublicKeySingleton.js';

export async function registerCommunity(name: string, description: string, address: string): Promise<string> {
    // Register the community with the Infrastructure Server
    try {
        let keypair = await KeypairSingleton.getInstance();
        let publicKey = keypair.publicKey.export({
            type: "spki",
            format: "pem"
        });

        let url = "";
        if (process.env.INFRASTRUCTURE_SERVER_ADDRESS !== undefined) url = new URL(process.env.INFRASTRUCTURE_SERVER_ADDRESS).toString();  // This will always be true, as the value is checked in index.ts (but TypeScript doesn't know this)
        
        log.info("Sending request to register community");
        let response = await axios({
            method: "post",
            url: addPathToUrl(url, "/communities"),
            data: {
                name: name,
                description: description,
                address: address,
                publicKey: publicKey
            },
            validateStatus: status => {
                // Throw error unless status code is one of the following
                switch (status) {
                    case 200:
                    case 409:
                    case 403:
                        return true;
                    default:
                        return false;
                }
            }
        });

        if (response.data.code !== undefined) {
            switch (response.data.code) {
                case RESPONSE_CODES.CommunityNameNotUnique:
                    return "CommunityNameNotUnique";
                case RESPONSE_CODES.UnsuitableAddress:
                    return "UnsuitableAddress";
                case RESPONSE_CODES.Success:
                    return "Success";
                default:
                    return "GenericFailure";
            }
        } else {
            return "GenericFailure";
        }
    } catch (e) {
        log.error(e, "Something went wrong while registering community");
        return "GenericFailure";
    }
}

export async function updateCommunity(currentName: string, communityInfo: ICommunityBody) {
    try {

        let url = "";
        if (process.env.INFRASTRUCTURE_SERVER_ADDRESS !== undefined) url = new URL(process.env.INFRASTRUCTURE_SERVER_ADDRESS).toString();  // This will always be true, as the value is checked in index.ts (but TypeScript doesn't know this)

        // Sign the request
        communityInfo = await addSignature(communityInfo);

        log.info("Sending request to update community info");
        // Send request
        let response = await axios({
            method: "patch",
            url: addPathToUrl(url, `/communities/${encodeURIComponent(currentName)}`),  // Use HTML percent encoding for characters that can't be sent in a URL
            data: communityInfo,
            validateStatus: status => {
                // Throw error unless response status is one of the following
                switch (status) {
                    case 200:
                    case 401:
                    case 403:
                    case 404:
                    case 409:
                        return true;
                    default:
                        return false;

                }
            }
        });

        if (response.data.code !== undefined) {
            switch (response.data.code) {
                case RESPONSE_CODES.Success:
                    return "Success";
                // CommunityNotFound, UnauthorisedCommunityRequest, and StaleRequest are not the result of user input so shouldn't happen here.  If they do, something is very wrong so log them as errors.
                case RESPONSE_CODES.CommunityNotFound:
                    log.error(`Failed to update community ${currentName} as the community was not found on the Infrastructure Server`);
                    return "CommunityNotFound";
                case RESPONSE_CODES.UnauthorisedCommunityRequest:
                    log.error(`Failed to update community.  The request was unauthorised.`);
                    return "UnauthorisedCommunityRequest";
                case RESPONSE_CODES.StaleRequest:
                    log.error(`Failed to update community.  The request was stale`);
                    return "StaleRequest";
                case RESPONSE_CODES.CommunityNameNotUnique:
                    return "CommunityNameNotUnique";
                case RESPONSE_CODES.UnsuitableAddress:
                    return "UnsuitableAddress";
                default:
                    return "GenericFailure";
            }
        } else return "GenericFailure";
    } catch (e) {
        log.error(e, "Something went wrong while updating community");
        return "GenericFailure";
    }
}

export async function removeCommunity(name: string) {
    try {
        let url = "";
        if (process.env.INFRASTRUCTURE_SERVER_ADDRESS !== undefined) url = new URL(process.env.INFRASTRUCTURE_SERVER_ADDRESS).toString();  // This will always be true, as the value is checked in index.ts (but TypeScript doesn't know this)

        let body = await addSignature({});  // RemoveCommunity only takes the timestamp and signature fields

        log.info(`Sending request to remove community ${name}`);
        let response = await axios({
            method: "delete",
            url: addPathToUrl(url, `/communities/${encodeURIComponent(name)}`), // Use HTML percent encoding for characters that can't be sent in a URL
            data: body,
            validateStatus: status => {
                // Throw error unless response status is one of the following
                switch (status) {
                    case 200:
                    case 401:
                    case 403:
                    case 404:
                        return true;
                    default:
                        return false;
                    
                }
            }
        });

        if (response.data.code !== undefined) {
            switch (response.data.code) {
                case RESPONSE_CODES.Success:
                    return "Success";
                // CommunityNotFound, UnauthorisedCommunityRequest, and StaleRequest are not the result of user input so shouldn't happen here.  If they do, something is very wrong so log them as errors.
                case RESPONSE_CODES.CommunityNotFound:
                    log.error(`Failed to remove community ${name} as the community was not found on the Infrastructure Server`);
                    return "CommunityNotFound";
                case RESPONSE_CODES.UnauthorisedCommunityRequest:
                    log.error(`Failed to remove community.  The request was unauthorised`);
                    return "UnauthorisedCommunityRequest";
                case RESPONSE_CODES.StaleRequest:
                    log.error(`Failed to remove community.  The request was stale`);
                    return "StaleRequest";
            }
        } else return "GenericFailure";
    } catch (e) {
        log.error(e, "Something went wrong while removing community");
        return "GenericFailure";
    }
}

export async function verifyToken(token: string): Promise<IJwtPayload | false> {
    // Verify JWT

    let keyInstance = await InfrastructureServerPublicKeySingleton.getInstance();
    let publicKey = keyInstance.publicKey;

    // jsonwebtoken doesn't return Promises, so use it inside a Promise
    return new Promise((resolve) => {
        jsonwebtoken.verify(token, publicKey, (err, decoded) => {
            if (err) {
                // Invalid token.  Check if key has changed
                resolve(compareKeyHashes(token));
            } else {
                try {
                    let parsedPayload: IJwtPayload = parsePayload(decoded);
                    resolve(parsedPayload);
                } catch (e) {
                    // Payload is malformed
                    resolve(false);
                }
            }
        });
    });
}

export async function getPublicKey(): Promise<string> {
    // Get the Infrastructure Server's public key
    try {
        log.info(`Fetching Infrastructure Server's public key`);

        let url = "";
        if (process.env.INFRASTRUCTURE_SERVER_ADDRESS !== undefined) url = new URL(process.env.INFRASTRUCTURE_SERVER_ADDRESS).toString();  // This will always be true, as the value is checked in index.ts (but TypeScript doesn't know this)

        let response = await axios({
            method: "get",
            url: addPathToUrl(url, "/publicKey")
        });

        if (response.data.data !== undefined && response.data.data[0] !== undefined) {
            return response.data.data[0];
        } else {
            log.fatal("Failed to get Infrastructure Server's public key: response from server did not contain the key");
            process.exit(1);
        }
    } catch (e) {
        log.fatal(e, "Failed to get Infrastructure Server's public key");
        process.exit(1);
    }
}

function parsePayload(payload: any): IJwtPayload {
    if (
        payload.username !== undefined && typeof payload.username === "string" && 
        payload.publicKeyHash !== undefined && typeof payload.publicKeyHash === "string"
    ) {
        return payload;
    } else {
        throw "Malformed JWT payload";
    }
}

function addPathToUrl(url: string, path: string) {
    // Add path to URL, prefixed by a slash if the URL doesn't already have one on the end
    if (url.endsWith("/")) {
        url = url.slice(0, url.length - 1);
    }
    if (path.startsWith("/")) {
        path = path.slice(1, path.length);
    }

    return `${url}/${path}`;
}

async function addSignature(communityInfo: ICommunityBody): Promise<ICommunityBody> {

    // Add current timestamp to request body
    communityInfo.timestamp = Math.floor(Date.now() / 1000);
    
    /*
        To ensure the hashes match, the body fields must be combined into a string exactly as required by the specification
            - The entries must be ordered (ascending) by the sum of the Unicode numerical representations of each character in the keyname
            - The entries must be combined into a string in the following format:
                "<key name>:<entry value>,<key name>:<entry value>"
    */
    let sortedKeyNames = Object.keys(communityInfo).sort();  // JS' sort function sorts strings by UTF-16 values rather than UTF-8 but this is fine for our purposes
    let entries = Object.entries(communityInfo);
    let bodyString = "";
    for (let i in sortedKeyNames) {
        let key = sortedKeyNames[i];
        // If not the first entry, then prefix with a comma to separate from the previous entry
        if (bodyString !== "") {
            bodyString += ",";
        }
        let entry = entries.find(element => element[0] === key);
        if (entry !== undefined) bodyString += `${key}:${entry[1]}`;
    }

    let keypair = await KeypairSingleton.getInstance();
    let sign = createSign("RSA-SHA256");
    sign.update(bodyString);
    communityInfo.signature = sign.sign(keypair.privateKey, "base64");

    return communityInfo;
}

async function compareKeyHashes(token: string): Promise<IJwtPayload | false> {
    /*
        Check if public key hash digest matches the one in the JWT (if the JWT has one).
        If they don't match it may indicate that the Infrastructure Server's public key has changed so we should check to see if this is the case
    */
    try {
        let keyInstance = await InfrastructureServerPublicKeySingleton.getInstance();
        let parsedPayload: IJwtPayload = parsePayload(jsonwebtoken.decode(token));
        let keyHash = keyInstance.publicKeyHashDigest;
        if (parsedPayload.publicKeyHash !== keyHash) {
            // The keys do not match, fetch the public key from the Infrastructure Server to ensure we have the most up to date version of it
            await keyInstance.fetchKey();
            if (keyInstance.publicKeyHashDigest !== keyHash) {
                // The key has changed, so try verifying the token again
                return await verifyToken(token);
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}