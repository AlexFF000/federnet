/*
    Test suite for testing community related functionality
*/

import * as testing from './testUtils.js';
import TestSet from './Structures/TestSet.js';
import { RESPONSE_CODES } from './constants.js';
import { Community } from './Structures/APIObjects.js';
import { randomUUID, generateKeyPairSync, createPrivateKey, createSign } from 'crypto';
import express from 'express';
import Response from './Structures/Response.js';

const mockServer = express();

const infrastructureServerCommunitiesEndpoint = "/communities";

let tests_Community_InfrastructureServer = [];
let tests_Community = tests_Community_InfrastructureServer;

let tests_Community_InfrastructureServer_RegisterCommunity = new TestSet(test_Community_RegisterCommunity_AddressWithoutPortSuccess, test_Community_RegisterCommunity_AddressWithPortSuccess, test_Community_RegisterCommunity_UnsuitableAddress, test_Community_RegisterCommunity_CommunityNameNotUnique);
tests_Community_InfrastructureServer.push(tests_Community_InfrastructureServer_RegisterCommunity);

function startMockCommunityServer(port, sharedData) {
    // Start a server that responds to community server Ping requests
    mockServer.get("/ping", (req, res) => {
        res.status(200);  // 200 Ok
        res.send({
            code: RESPONSE_CODES.Success,
            message: "Pong"
        });
    });

    sharedData.server = mockServer.listen(port);
}

function stopMockCommunityServer(sharedData) {
    sharedData.server.close();
}

function signCommunityRequest(body, privateKey, privateKeyPassphrase) {
    // Generate a signature from the body of a community management request using the community's private key

    // Convert the body to a string in the exact format given by the specification
    // Fields should be ordered by total Unicode value of keynames
    let sortedKeys = Object.keys(body).sort();
    // Fields should then be combined into a string in format: "<key name>:<value>,<key name>:<value>"
    let bodyString = "";
    for (let i in sortedKeys) {
        let key = sortedKeys[i];
        if (body[key] !== undefined) {
            bodyString += `${key}:${body[key]}`;
            // If not the last entry to be appended, add a comma
            if (i < sortedKeys.length - 1) {
                bodyString += ",";
            }
        }
    }

    let privateKeyObject = createPrivateKey({
        key: privateKey,
        passphrase: privateKeyPassphrase
    });

    let sign = createSign("RSA-SHA256");
    sign.update(bodyString);

    return sign.sign(privateKeyObject, "base64");
}

async function test_Community_RegisterCommunity_AddressWithoutPortSuccess(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let community = new Community();
    community.name = `test_Community_AddressWithoutPortSuccess_${randomUUID()}`;
    community.description = "This community was registered as part of an automated test";
    community.address = `http://127.0.0.1`;

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

    // Start mock HTTP server to pretend to be a community server by responding to Ping requests
    startMockCommunityServer(80, sharedData);
    
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        },
        community)
    );

    // Close mock server
    stopMockCommunityServer(sharedData);

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

async function test_Community_RegisterCommunity_AddressWithPortSuccess(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let community = new Community();
    community.name = `test_Community_AddressWithPortSuccess_${randomUUID()}`;
    community.description = "This community was registered as part of an automated test";
    community.address = `http://127.0.0.1:25580`;

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

    // Start mock HTTP server to pretend to be a community server by responding to Ping requests
    startMockCommunityServer(25580, sharedData);
    
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        },
        community)
    );

    // Close mock server
    stopMockCommunityServer(sharedData);

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

async function test_Community_RegisterCommunity_UnsuitableAddress(servers, sharedData) {
    // Try to register a community when no community server exists at the given address
    let infraServerUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 403;  // 403 Forbidden
    expectedResponse.body.code = RESPONSE_CODES.UnsuitableAddress;

    let community = new Community();
    community.name = `test_Community_UnsuitableAddress_${randomUUID()}`;
    community.description = "This community was registered as part of an automated test";
    community.address = `http://127.0.0.1:25580`;

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
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        }, 
        community)
    );


    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

async function test_Community_RegisterCommunity_CommunityNameNotUnique(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 409;  // 409 Conflict
    expectedResponse.body.code = RESPONSE_CODES.CommunityNameNotUnique;

    let community = new Community();
    community.name = `test_Community_CommunityNameNotUnique_${randomUUID()}`;
    community.description = "This community was registered as part of an automated test";
    community.address = `http://127.0.0.1:25580`;

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

    // Start mock HTTP server to pretend to be a community server by responding to Ping requests
    startMockCommunityServer(25580, sharedData);
    
    let testResult = testing.assertResponseReceived(await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        },
        community)
    ));

    if (testResult !== true) return testResult;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        },
        community)
    );

    // Close mock server
    stopMockCommunityServer(sharedData);

    testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);

    return testResult;
}

// UpdateCommunity tests

let tests_Community_InfrastructureServer_UpdateCommunity = new TestSet(test_Community_UpdateCommunity_CommunityNotFound, test_Community_UpdateCommunity_UnauthorisedCommunityRequest, test_Community_UpdateCommunity_StaleRequest, test_Community_UpdateCommunity_CommunityNameNotUnique, test_Community_UpdateCommunity_UnsuitableAddress, test_Community_UpdateCommunity_Success);
tests_Community_InfrastructureServer.push(tests_Community_InfrastructureServer_UpdateCommunity);
// Create a new community before running each test
tests_Community_InfrastructureServer_UpdateCommunity.runBeforeEach(createCommunity);

async function createCommunity(servers, sharedData) {
    // Create a community for use in tests
    let infraServerUrl = servers.infrastructureServer;

    sharedData.communityPort = 25580;

    let community = new Community();
    community.name = `test_Community_${randomUUID()}`;
    community.description = "This community was registered as part of an automated test";
    community.address = new URL(`http://127.0.0.1:${sharedData.communityPort}`).toString();

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

    community.publicKey = publicKey;

    sharedData.communityPublicKey = publicKey;
    sharedData.communityPrivateKey = privateKey;
    sharedData.communityPrivateKeyPassphrase = "secret";

    // Start mock HTTP server to pretend to be a community server by responding to Ping requests
    startMockCommunityServer(sharedData.communityPort, sharedData);

    let response = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        }, 
        community)
    );

    stopMockCommunityServer(sharedData);

    let responseWith200Status = new Response();
    responseWith200Status.status = 200;  // 200 Ok

    let responseCorrect = testing.assertResponseReceived(response);
    if (responseCorrect !== true) {
        console.log(`Error: Failed to create community ${community.name} with ${community.address}.  ${responseCorrect}`);
        return `TERMINATE`;
    }
    responseCorrect = testing.assertResponsesMatch(responseWith200Status, response);
    if (responseCorrect !== true) {
        console.log(`Error: Failed to create community ${community.name} with ${community.address}.  ${responseCorrect}`);
        return `TERMINATE`;
    }

    sharedData.community = community;
}

async function test_Community_UpdateCommunity_CommunityNotFound(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let communityName = `tests_Community_CommunityNotFound_${randomUUID()}`;
    let endpoint = `${infrastructureServerCommunitiesEndpoint}/${communityName}`;

    let newInfo = new Community();
    newInfo.description = "A new description";
    
    let body = testing.createBody(newInfo, {timestamp: Math.floor(Date.now() / 1000)});
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);

    let expectedResponse = new Response();
    expectedResponse.status = 404;  // 404 Not Found
    expectedResponse.body.code = RESPONSE_CODES.CommunityNotFound;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.PATCH,
        body
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_UpdateCommunity_UnauthorisedCommunityRequest(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let newInfo = new Community();
    newInfo.description = "A new description";

    let body = testing.createBody(newInfo, {timestamp: Math.floor(Date.now() / 1000)});
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);

    // Add another field to the body so the signature no longer matches
    body.name = `tests_Community_UpdateCommunity_UnauthorisedCommunityRequest_${randomUUID()}`;
    
    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.UnauthorisedCommunityRequest;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`,
        testing.HTTP_METHODS.PATCH,
        body
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_UpdateCommunity_StaleRequest(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let newInfo = new Community();
    newInfo.description = "A new description";

    let body = testing.createBody(newInfo, {timestamp: Math.floor(Date.now() / 1000) - 61});  // Make timestap more than 60 seconds old so the request is stale
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);

    let expectedResponse = new Response();
    expectedResponse.status = 403;  // 403 Forbidden
    expectedResponse.body.code = RESPONSE_CODES.StaleRequest;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`,
        testing.HTTP_METHODS.PATCH,
        body
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_UpdateCommunity_CommunityNameNotUnique(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    // Create another community so that the name will be a duplicate
    let community = new Community();
    community.name = `test_Community_CommunityNameNotUnique_${randomUUID()}`;
    community.description = "This community was registered as part of an automated test";
    community.address = `http://127.0.0.1:${sharedData.communityPort}`;

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

    // Start mock HTTP server to pretend to be a community server by responding to Ping requests
    startMockCommunityServer(sharedData.communityPort, sharedData);

    let testResult = testing.assertResponseReceived(await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        }, 
        community)
    ));

    stopMockCommunityServer(sharedData);

    if (testResult !== true) return testResult;

    let expectedResponse = new Response();
    expectedResponse.status = 409;  // 409 Conflict
    expectedResponse.body.code = RESPONSE_CODES.CommunityNameNotUnique;
    
    let newInfo = new Community();
    newInfo.name = community.name;

    let body = testing.createBody(newInfo, {timestamp: Math.floor(Date.now() / 1000)});
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`,
        testing.HTTP_METHODS.PATCH,
        body
    );

    testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_UpdateCommunity_UnsuitableAddress(servers, sharedData) {
    // Try to change the community address to one that doesn't have a community server listening on it
    let infraServerUrl = servers.infrastructureServer;

    let endpoint = `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`;

    let newInfo = new Community();
    newInfo.address = "127.0.0.1:22";
    
    let body = testing.createBody(newInfo, {timestamp: Math.floor(Date.now() / 1000)});
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);

    let expectedResponse = new Response();
    expectedResponse.status = 403;  // 403 Forbidden
    expectedResponse.body.code = RESPONSE_CODES.UnsuitableAddress;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.PATCH,
        body
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_UpdateCommunity_Success(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let endpoint = `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`;

    let newInfo = new Community();
    newInfo.name = `test_Community_UpdateCommunity_Success_${randomUUID()}`;
    newInfo.description = "This description was updated as part of an automated test";
    
    let body = testing.createBody(newInfo, {timestamp: Math.floor(Date.now() / 1000)});
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.PATCH,
        body
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

// GetCommunityInfo tests
let tests_Community_InfrastructureServer_GetCommunityInfo = new TestSet(test_Community_GetCommunityInfo_CommunityNotFound, test_Community_GetCommunityInfo_Success);
tests_Community_InfrastructureServer.push(tests_Community_InfrastructureServer_GetCommunityInfo);
tests_Community_InfrastructureServer_GetCommunityInfo.runBeforeAll(createCommunity);

async function test_Community_GetCommunityInfo_CommunityNotFound(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;
    let endpoint = `${infrastructureServerCommunitiesEndpoint}/test_Community_GetCommunityInfo_CommunityNotFound_${randomUUID()}`;

    let expectedResponse = new Response();
    expectedResponse.status = 404;  // 404 Not Found
    expectedResponse.body.code = RESPONSE_CODES.CommunityNotFound;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.GET
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_GetCommunityInfo_Success(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;
    let endpoint = `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.GET
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertListContains(actualResponse.body.data, sharedData.community.getDict());
    if (testResult !== true) return testResult;

    return testResult;
}

// RemoveCommunity tests
let tests_Community_InfrastructureServer_RemoveCommunity = new TestSet(test_Community_RemoveCommunity_CommunityNotFound, test_Community_RemoveCommunity_UnauthorisedCommunityRequest, test_Community_RemoveCommunity_StaleRequest, test_Community_RemoveCommunity_Success);
tests_Community_InfrastructureServer.push(tests_Community_InfrastructureServer_RemoveCommunity);
tests_Community_InfrastructureServer_RemoveCommunity.runBeforeEach(createCommunity);

async function test_Community_RemoveCommunity_CommunityNotFound(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;
    let endpoint = `${infrastructureServerCommunitiesEndpoint}/test_Community_RemoveCommunity_CommunityNotFound_${randomUUID()}`;

    let body = {timestamp: Math.floor(Date.now() / 1000)};
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.DELETE,
        body
    );

    let expectedResponse = new Response();
    expectedResponse.status = 404;  // 404 Not Found
    expectedResponse.body.code = RESPONSE_CODES.CommunityNotFound;

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_RemoveCommunity_UnauthorisedCommunityRequest(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;
    let endpoint = `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`;

    let body = {timestamp: Math.floor(Date.now() / 1000)};
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);

    // Modify body to invalidate signature
    body.timestamp = Math.floor(Date.now() / 1000) - 5;


    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.DELETE,
        body
    );

    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.UnauthorisedCommunityRequest;

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_RemoveCommunity_StaleRequest(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;
    let endpoint = `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`;

    let body = {timestamp: Math.floor(Date.now() / 1000) - 61};  // Make timestamp at least 60 seconds old to make request stale
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);


    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.DELETE,
        body
    );

    let expectedResponse = new Response();
    expectedResponse.status = 403;  // 403 Forbidden
    expectedResponse.body.code = RESPONSE_CODES.StaleRequest;

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Community_RemoveCommunity_Success(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;
    let endpoint = `${infrastructureServerCommunitiesEndpoint}/${sharedData.community.name}`;

    let body = {timestamp: Math.floor(Date.now() / 1000)};
    body.signature = signCommunityRequest(body, sharedData.communityPrivateKey, sharedData.communityPrivateKeyPassphrase);


    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.DELETE,
        body
    );

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Success
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    // Use GetCommunityInfo request to check that the community has been deleted
    expectedResponse = new Response();
    expectedResponse.status = 404;  // 404 Not Found
    expectedResponse.body.code = RESPONSE_CODES.CommunityNotFound;

    actualResponse = await testing.sendRequest(
        infraServerUrl,
        endpoint,
        testing.HTTP_METHODS.GET
    );

    testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

// FetchCommunities tests
let tests_Community_InfrastructureServer_FetchCommunities = new TestSet(test_Community_FetchCommunities_Success);
tests_Community_InfrastructureServer.push(tests_Community_InfrastructureServer_FetchCommunities);

async function test_Community_FetchCommunities_Success(servers, sharedData) {
    // Add some communities and make sure they are in the list of returned communities
    let infraServerUrl = servers.infrastructureServer;
    
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

    let community1 = new Community();
    community1.name = `test_Community_FetchCommunities_Success_${randomUUID()}`;
    community1.description = "This community was created as part of an automated test";
    community1.address = new URL(`http://127.0.0.1:25580`).toString();
    community1.publicKey = publicKey;

    let community2 = new Community();
    community2.name = `test_Community_FetchCommunities_Success_${randomUUID()}`;
    community2.description = "This community was created as part of an automated test";
    community2.address = new URL(`http://127.0.0.1:25581`).toString();
    community2.publicKey = publicKey;

    let community3 = new Community();
    community3.name = `test_Community_FetchCommunities_Success_${randomUUID()}`;
    community3.description = "This community was created as part of an automated test";
    community3.address = new URL(`http://127.0.0.1:25582`).toString();
    community3.publicKey = publicKey;

    let responseWith200Status = new Response();
    responseWith200Status.status = 200;

    startMockCommunityServer(25580, sharedData);

    let response = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        },
        community1)
    );

    stopMockCommunityServer(sharedData);

    let testResult = testing.assertResponseReceived(response);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(responseWith200Status, response);
    if (testResult !== true) return testResult;

    startMockCommunityServer(25581, sharedData);

    response = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        },
        community2)
    );

    stopMockCommunityServer(sharedData);
    
    testResult = testing.assertResponseReceived(response);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(responseWith200Status, response);
    if (testResult !== true) return testResult;

    startMockCommunityServer(25582, sharedData);

    response = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody({
            "public_key": publicKey
        },
        community3)
    );

    stopMockCommunityServer(sharedData);
    
    testResult = testing.assertResponseReceived(response);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(responseWith200Status, response);
    if (testResult !== true) return testResult;


    // Send FetchCommunities request
    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;
    
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerCommunitiesEndpoint,
        testing.HTTP_METHODS.GET,
    );

    testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertListContains(actualResponse.body.data, community1.getDict());
    if (testResult !== true) return testResult;
    testResult = testing.assertListContains(actualResponse.body.data, community2.getDict());
    if (testResult !== true) return testResult;
    testResult = testing.assertListContains(actualResponse.body.data, community3.getDict());
    if (testResult !== true) return testResult;

    return testResult;
}
export {
    tests_Community,
    tests_Community_InfrastructureServer,
    tests_Community_InfrastructureServer_RegisterCommunity,
    tests_Community_InfrastructureServer_UpdateCommunity,
    tests_Community_InfrastructureServer_GetCommunityInfo,
    tests_Community_InfrastructureServer_RemoveCommunity,
    tests_Community_InfrastructureServer_FetchCommunities
}