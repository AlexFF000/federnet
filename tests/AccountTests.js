/*
    Test suite for testing account functionality
*/
import {randomUUID, generateKeyPairSync} from 'crypto';

import * as testing from './testUtils.js';
import TestSet from './Structures/TestSet.js';
import Response from './Structures/Response.js';
import {Account} from './Structures/apiObjects.js';
import {RESPONSE_CODES} from './constants.js';

const accountsEndpoint = "/accounts";

let tests_Account_CreateAccount = new TestSet(test_Account_CreateAccount_Successful, test_Account_CreateAccount_PasswordComplexityNotMet, test_Account_CreateAccount_UsernameNotUnique);
let tests_Account = [tests_Account_CreateAccount];

async function test_Account_CreateAccount_Successful(servers, sharedData) {
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let account = new Account();
    account.username = `test_Account_CreateAccount_Successful_${randomUUID()}`;
    account.password = "^&DADP)AS-sdsfsC*";
    // Send request
    let actualResponse = await testing.sendRequest(serverUrl, accountsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(account));

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

async function test_Account_CreateAccount_PasswordComplexityNotMet(servers, sharedData) {
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 403;  // 403 Forbidden
    expectedResponse.body.code = RESPONSE_CODES.UnsuitablePassword;
    
    let account = new Account();
    account.username = `test_Account_CreateAccount_PasswordComplexityNotMet_${randomUUID()}`;
    account.password = "a";

    // Send request
    let actualResponse = await testing.sendRequest(serverUrl, accountsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(account));

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

async function test_Account_CreateAccount_UsernameNotUnique(servers, sharedData) {
    // Try to create an account twice with the same username, the second request should give a UsernameNotUnqiue response
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 409;  // 409 - Conflict
    expectedResponse.body.code = RESPONSE_CODES.UsernameNotUnique;

    let account = new Account();
    account.username = `test_Account_CreateAccount_UsernameNotUnique_${randomUUID}`;
    account.password = `^&DADP)AS-sdsfsC*`;

    let testResult = testing.assertResponseReceived(await testing.sendRequest(serverUrl, accountsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(account)));
    if (testResult !== true) return testResult;

    // Send second request
    let actualResponse = await testing.sendRequest(serverUrl, accountsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(account));

    testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

// GetSession tests
let tests_Account_GetSession = new TestSet(test_Account_GetSession_Success, test_Account_GetSession_IncorrectUsername, test_Account_GetSession_IncorrectPassword);
tests_Account.push(tests_Account_GetSession);
const sessionsEndpoint = "/sessions";

tests_Account_GetSession.runBeforeAll(createAccount);

async function createAccount(servers, sharedData) {
    let serverUrl = servers.infrastructureServer;
    // Create an account for use in tests

    let account = new Account();
    account.username = `test_Account_${randomUUID()}`;
    account.password = "^&DADP)AS-sdsfsC*";

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

async function test_Account_GetSession_Success(servers, sharedData) {
    // Log into the account with the correct credentials, and check that a valid JWT is received
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(serverUrl, sessionsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(sharedData.account));

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertJwtUsernameMatches(actualResponse.body.data[0], sharedData.account.username);

    return testResult;
}

async function test_Account_GetSession_IncorrectUsername(servers, sharedData) {
    // Try to log in to account with incorrect username but correct password, and check that BadCredentials code is received
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 - Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.BadCredentials;

    let account = new Account();
    account.username = `${randomUUID()}`;  // Use a random UUID to avoid accidentally using a username that does exist
    account.password = sharedData.account.password;

    let actualResponse = await testing.sendRequest(serverUrl, sessionsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(account));

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

async function test_Account_GetSession_IncorrectPassword(servers, sharedData) {
    // Try to log in to account with incorrect password but correct username, and check that BadCredentials code is received
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 - Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.BadCredentials;

    let account = new Account();
    account.username = sharedData.account.username;
    account.password = sharedData.account.password + "1";

    let actualResponse = await testing.sendRequest(serverUrl, sessionsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(account));

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

// SetPublicKey tests
let tests_Account_SetPublicKey = new TestSet(tests_Account_SetPublicKey_Success, tests_Account_SetPublicKey_ModifedToken);
tests_Account.push(tests_Account_SetPublicKey);

tests_Account_SetPublicKey.runBeforeAll(createAccount, getSession);

async function getSession(servers, sharedData) {
    // Get a session token for an account to be used in tests
    let serverUrl = servers.infrastructureServer;

    let response = await testing.sendRequest(serverUrl, sessionsEndpoint, testing.HTTP_METHODS.POST, testing.createBody(sharedData.account));

    let responseWith200Status = new Response();
    responseWith200Status.status = 200;

    let responseCorrect= testing.assertResponseReceived(response);
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

async function tests_Account_SetPublicKey_Success(servers, sharedData) {
    // Set account public key, and check response has Success code
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;
    
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

    let actualResponse = await testing.sendRequest(
        serverUrl, 
        `${accountsEndpoint}/${sharedData.account.username}`, 
        testing.HTTP_METHODS.PUT, 
        testing.createBody({
            "public_key": publicKey
        },
        {
            Authorization: `Bearer ${sharedData.jwt}`
        }
    ));

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse);

    return testResult;
}

async function tests_Account_SetPublicKey_ModifedToken(servers, sharedData) {
    // Try to set account public key using a Jwt which has been modified, and check that unauthorised code is sent back
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 - Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.UnauthorisedUserRequest;
    
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

    let actualResponse = await testing.sendRequest(
        serverUrl, 
        `${accountsEndpoint}/${sharedData.account.username}`, 
        testing.HTTP_METHODS.PUT, 
        testing.createBody({
            "public_key": publicKey
        },
        {
            Authorization: `Bearer ${sharedData.jwt.substr(0, Math.floor(sharedData.jwt.length / 2))} a ${sharedData.jwt.substr(Math.floor(sharedData.jwt.length / 2))}`  // Add an extra letter "a" in the middle of the token string
        }
    ));

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse);

    return testResult;
}

// GetPublicKey tests
let tests_Account_GetPublicKey = new TestSet(test_Account_GetPublicKey_UserNotFound, test_Account_GetPublicKey_NoPublicKey, test_Account_GetPublicKey_Success);
tests_Account.push(tests_Account_GetPublicKey);

tests_Account_GetPublicKey.runBeforeAll(createAccount);

async function test_Account_GetPublicKey_UserNotFound(servers, sharedData) {
    // Request the public key for a user that doesn't exist, and check response has UserNotFound code
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 404;  // 404 - Not Found
    expectedResponse.body.code = RESPONSE_CODES.UserNotFound;

    let actualResponse = await testing.sendRequest(serverUrl, `${accountsEndpoint}/${randomUUID()}`, testing.HTTP_METHODS.GET);  // Use randomUUID as username to avoid accidentally using a username that does exist

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

async function test_Account_GetPublicKey_NoPublicKey(servers, sharedData) {
    // Request the public key for a user that does not yet gave a public key, and check response has NoPublicKey code
    let serverUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 404;  // 404 - Not Found
    expectedResponse.body.code = RESPONSE_CODES.NoPublicKey;

    let actualResponse = await testing.sendRequest(serverUrl, `${accountsEndpoint}/${sharedData.account.username}`, testing.HTTP_METHODS.GET);

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

async function test_Account_GetPublicKey_Success(servers, sharedData) {
    // Set the public key for a user and then request the users key, and check that the reponse contains the key
    let serverUrl = servers.infrastructureServer;

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

    // Send request to set key
    let response = await testing.sendRequest(
        serverUrl, 
        `${accountsEndpoint}/${sharedData.account.username}`, 
        testing.HTTP_METHODS.PUT, 
        testing.createBody({
            "public_key": publicKey
        },
        {
            Authorization: `Bearer ${sharedData.jwt}`
        }
    ));

    let testResult = testing.assertResponseReceived(response);
    if (testResult !== true) return testResult;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(serverUrl, `${accountsEndpoint}/${sharedData.account.username}`, testing.HTTP_METHODS.GET);

    testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertObjectsEqual([publicKey], actualResponse.body.data);
    
    return testResult;
}

export {
    tests_Account,
    tests_Account_CreateAccount,
    tests_Account_GetSession,
    tests_Account_GetPublicKey,
    tests_Account_SetPublicKey
}