/*
    Helper methods used in multiple sets of tests
*/
import { randomUUID, generateKeyPairSync } from 'crypto';

import * as testing from './testUtils.js';
import Response from './Structures/Response.js';
import { Account } from './Structures/apiObjects.js';
import { accountsEndpoint, sessionsEndpoint } from './constants.js';


export async function createAccount(servers, sharedData) {
    let serverUrl = servers.infrastructureServer;
    // Create an account for use in tests

    let account = new Account();
    account.username = `test_Account_${randomUUID()}`;
    account.password = "^&DADP)AS-s3dsf5sC1*";

    let response = await testing.sendRequest(serverUrl, accountsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(account));
    
    let responseWith200Status = new Response();
    responseWith200Status.status = 200;
    
    let responseCorrect = testing.assertResponseReceived(response);
    if (responseCorrect !== true) {
        console.log(`Error: Failed to create account: ${account.username} for tests.  ${responseCorrect}`);
        return "TERMINATE";
    }
    responseCorrect = testing.assertResponsesMatch(responseWith200Status, response);
    if (responseCorrect !== true) {
        console.log(`Error: Failed to create account ${account.username} for tests.  ${responseCorrect}`);
        return "TERMINATE";
    }

    // Write account to sharedData for use in the tests
    sharedData.account = account;
}

export async function getSession(servers, sharedData) {
    // Get a session token for an account to be used in tests
    let serverUrl = servers.infrastructureServer;

    let response = await testing.sendRequest(serverUrl, sessionsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(sharedData.account));

    let responseWith200Status = new Response();
    responseWith200Status.status = 200;

    let responseCorrect = testing.assertResponseReceived(response);
    if (responseCorrect !== true) {
        console.log(`Error: Failed to get session for account ${sharedData.account.username} for tests.  ${responseCorrect}`);
        return "TERMINATE";
    }
    responseCorrect = testing.assertResponsesMatch(responseWith200Status, response);
    if (responseCorrect !== true) {
        console.log(`Error: Failed to get session for account ${sharedData.account.username} for tests.  ${responseCorrect}`);
        return "TERMINATE";
    }

    try {
        sharedData.jwt = response.body.data[0];
    } catch (e) {
        console.log(`Error: Unable to get Jwt from response body for account ${sharedData.account.username} for tests. ${e}`);
        return "TERMINATE";
    }

}

export async function setPublicKey(servers, sharedData) {
    // Set public key for use in tests
    let serverUrl = servers.infrastructureServer;

    let responseWith200Status = new Response();
    responseWith200Status.status = 200;

    // Generate key pair
    let {publicKey, privateKey} = generateKeyPairSync("rsa", {
        modulusLength: 4096,
        publicKeyEncoding: {
            type: "spki",
            format: "pem"
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
            cipher: "aes-256-cbc",
            passphrase: "secret"
        }
    });

    let response = await testing.sendRequest(
        serverUrl, 
        `${accountsEndpoint}/${sharedData.account.username}`, 
        testing.HTTP_METHODS.PUT, 
        testing.createBody({
            "publicKey": publicKey
        }),
        {
            Authorization: `Bearer ${sharedData.jwt}`
        }
    );

    let responseCorrect = testing.assertResponseReceived(response);
    if (responseCorrect !== true) {
        console.log(`Error: Failed to set the public key for tests.  ${responseCorrect}`);
        return "TERMINATE";
    }
    responseCorrect = testing.assertResponsesMatch(responseWith200Status, response);
    if (responseCorrect !== true) {
        console.log(`Error: Failed to set the public key for tests.  ${responseCorrect}`);
        return "TERMINATE";
    }

    sharedData.accountPublicKey = publicKey;
    sharedData.accountPrivateKey = privateKey;
}

export function sleep(seconds) {
    /* 
        I know blocking the main thread is bad, don't worry I feel a suitable amount of shame for doing it.
        But the message timestamps are generated on the server side so the only way to get the timestamps we want is to actually wait an appropriate amount of time
    */
    // Sleep for a while
    console.log(`NOTE: A blocking sleep is about to start for ${seconds} seconds`);
    let stopTime = Math.floor(Date.now() / 1000) + seconds;
    while (Math.floor(Date.now() / 1000) < stopTime) {
        continue;
    }
    console.log(`NOTE: The blocking sleep has woken up`);
}