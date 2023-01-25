/*
    Test suite for testing Direct Message related functionality
*/

import * as testing from './testUtils.js';
import TestSet from './Structures/TestSet.js';
import { directMessagesEndpoint, RESPONSE_CODES } from './constants.js';
import Response from './Structures/Response.js';
import { createAccount, getSession, setPublicKey, sleep } from './helpers.js';
import { DirectMessage } from './Structures/apiObjects.js';
import { publicEncrypt, randomUUID } from 'crypto';

let tests_DirectMessage = [];

// SendDirectMessage tests
let tests_DirectMessage_SendDirectMessage = new TestSet(tests_DirectMessage_SendDirectMessage_UnauthorisedUserRequest, test_DirectMessage_SendDirectMessage_UserNotFound, test_DirectMessage_SendDirectMessage_NoPublicKey, test_DirectMessage_SendDirectMessage_Success);
tests_DirectMessage.push(tests_DirectMessage_SendDirectMessage);

tests_DirectMessage_SendDirectMessage.runBeforeEach(createAccount);  // Create an account to send the message to

function encryptMessageContent(content, publicKey) {
    // Encrypt message content using the given public key
    return publicEncrypt({
        key: publicKey
    }, content).toString("base64");
}

async function tests_DirectMessage_SendDirectMessage_UnauthorisedUserRequest(servers, sharedData) {
    // Send message when user isn't authorised
    let infraServerUrl = servers.infrastructureServer;

    let recipient = sharedData.account;
    // Set the recipient's public key
    await getSession(servers, sharedData);
    await setPublicKey(servers, sharedData);

    // Create message
    let textContent = "This message was generated as part of an automated test, test_DirectMessage_SendDirectMessage_UnauthorisedUserRequest";
    // Encrypt message content with the recipient's public key
    let encryptedContent = encryptMessageContent(textContent, sharedData.accountPublicKey);

    // Generate another account to be the sender
    await createAccount(servers, sharedData);
    // Get JWT for account
    await getSession(servers, sharedData);

    // Modify JWT to be in the correct format but invalid
    let modifiedJwt = `${sharedData.jwt.substr(0, Math.floor(sharedData.jwt.length / 2))}a${sharedData.jwt.substr(Math.floor(sharedData.jwt.length / 2))}`; // Add an extra letter "a" in the middle of the token string
    
    let message = new DirectMessage();
    message.recipientUsername = recipient.username;
    message.content = encryptedContent;

    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.UnauthorisedUserRequest;

    // Send SendDirectMessage request
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody(message),
        {
            "Authorization": `Bearer ${modifiedJwt}`
        }      
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_DirectMessage_SendDirectMessage_UserNotFound(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    // getSession for sender
    await getSession(servers, sharedData);

    // Create message
    let textContent = "This message was generated as part of an automated test, test_DirectMessage_SendDirectMessage_UserNotFound";

    let message = new DirectMessage();
    message.content = textContent;
    message.recipientUsername = `test_DirectMessage_SendDirectMessage_UserNotFound_${randomUUID()}`;  // Set recipient to a user that doesn't exist

    let expectedResponse = new Response();
    expectedResponse.status = 403;  // 403 Forbidden
    expectedResponse.body.code = RESPONSE_CODES.UserNotFound;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody(message),
        {
            "Authorization": `Bearer ${sharedData.jwt}`
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_DirectMessage_SendDirectMessage_NoPublicKey(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let recipient = sharedData.account;
    

    // Create message
    let textContent = "This message was generated as part of an automated test, test_DirectMessage_SendDirectMessage_NoPublicKey";

    let message = new DirectMessage();
    message.content = textContent;
    message.recipientUsername = recipient.username;

    // Create an account to use as sender
    await createAccount(servers, sharedData);
    await getSession(servers, sharedData);

    let expectedResponse = new Response();
    expectedResponse.status = 403;  // 403 Forbidden
    expectedResponse.body.code = RESPONSE_CODES.NoPublicKey;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody(message),
        {
            "Authorization": `Bearer ${sharedData.jwt}`
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_DirectMessage_SendDirectMessage_Success(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let recipient = sharedData.account;
    // Set the recipient's public key
    await getSession(servers, sharedData);
    await setPublicKey(servers, sharedData);

    // Create message
    let textContent = "This message was generated as part of an automated test, test_DirectMessage_SendDirectMessage_Success";
    // Encrypt message content with the recipient's public key
    let encryptedContent = encryptMessageContent(textContent, sharedData.accountPublicKey);
    let message = new DirectMessage();
    message.content = encryptedContent;
    message.recipientUsername = recipient.username;

    // Create an account to use as sender
    await createAccount(servers, sharedData);
    await getSession(servers, sharedData);

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody(message),
        {
            "Authorization": `Bearer ${sharedData.jwt}`
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

// FetchDirectMessages tests
let tests_DirectMessage_FetchDirectMessages = new TestSet(test_DirectMessage_FetchDirectMessages_UnauthorisedUserRequest, test_DirectMessage_FetchDirectMessages_All, test_DirectMessage_FetchDirectMessages_BeforeTime, test_DirectMessage_FetchDirectMessages_AfterTime, test_DirectMessage_FetchDirectMessages_BetweenTimes);
tests_DirectMessage.push(tests_DirectMessage_FetchDirectMessages);

async function sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender) {
    // Send a DM for use in tests
    let infraServerUrl = servers.infrastructureServer;
    
    // Hold any current data in sharedData
    let currentAccount = sharedData.account;
    let currentJwt = sharedData.jwt;

    // Get session for the sender
    sharedData.account = sender;
    await getSession(servers, sharedData);

    // Encrypt message content with the recipient's public key
    let textContent = `This message was generated as part of an automated test ${randomUUID()}`;
    let encryptedContent = encryptMessageContent(textContent, recipientPublicKey);
    let message = new DirectMessage();
    message.content = encryptedContent;
    message.recipientUsername = recipient.username;
    
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody(message),
        {
            "Authorization": `Bearer ${sharedData.jwt}`
        }
    );

    // Put old data back into sharedData
    sharedData.account = currentAccount;
    sharedData.jwt = currentJwt;

    return message;
}

async function test_DirectMessage_FetchDirectMessages_UnauthorisedUserRequest(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    await createAccount(servers, sharedData);
    await getSession(servers, sharedData);
    // Modify JWT to be in the correct format but invalid
    let modifiedJwt = `${sharedData.jwt.substr(0, Math.floor(sharedData.jwt.length / 2))}a${sharedData.jwt.substr(Math.floor(sharedData.jwt.length / 2))}`; // Add an extra letter "a" in the middle of the token string

    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.UnauthorisedUserRequest;

    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.GET,
        {},
        {
            "Authorization": `Bearer ${modifiedJwt}`,
            "Start-Time": Math.floor(Date.now() / 1000) - 1000,
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_DirectMessage_FetchDirectMessages_All(servers, sharedData) {
    // Send 10 messages and fetch all of them
    let infraServerUrl = servers.infrastructureServer;

    // Create a sender
    await createAccount(servers, sharedData);
    let sender = sharedData.account;
    // Create a recipient
    await createAccount(servers, sharedData);
    let recipient = sharedData.account;
    await getSession(servers, sharedData);
    await setPublicKey(servers, sharedData);
    let recipientPublicKey = sharedData.accountPublicKey;

    // Send 10 messages
    let sentMessages = [];
    for (let i = 0; i < 10; i++) {
        sentMessages.push(await sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender));
    }

    // GetSession for recipient
    sharedData.account = recipient;
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    // Fetch all messages
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.GET,
        {},
        {
            "Authorization": `Bearer ${jwt}`,
            "Start-Time": 0,
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    // Check if all the messages were returned
    for (let message of sentMessages) {
        testResult = testing.assertValuesEqual(sentMessages.length, actualResponse.body.data.length)
        if (testResult !== true) return testResult;
        testResult = testing.assertListContainsMessage(actualResponse.body.data, message);
        if (testResult !== true) return testResult;
    }

    return testResult;
}

async function test_DirectMessage_FetchDirectMessages_BeforeTime(servers, sharedData) {
    // Send 10 messages and fetch all that were sent before a certain time
    let infraServerUrl = servers.infrastructureServer;

    // Create a sender
    await createAccount(servers, sharedData);
    let sender = sharedData.account;
    // Create a recipient
    await createAccount(servers, sharedData);
    let recipient = sharedData.account;
    await getSession(servers, sharedData);
    await setPublicKey(servers, sharedData);
    let recipientPublicKey = sharedData.accountPublicKey;

    // Send first 5 messages
    let firstMessages = [];
    for (let i = 0; i < 5; i++) {
        firstMessages.push(await sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender));
    }

    // Wait 10 seconds, and then send the next 5 messages
    let timerStart = Math.floor(Date.now() / 1000);
    sleep(10);
    
    let lastMessages = [];
    for (let i = 0; i < 5; i++) {
        lastMessages.push(await sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender));
    }

    // GetSession for recipient
    sharedData.account = recipient;
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    // Fetch messages from before the sleep timer began (i.e. the first 5 messages)
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.GET,
        {},
        {
            "Authorization": `Bearer ${jwt}`,
            "Start-Time": 0,
            "End-Time": timerStart
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    // Check if all the messages were returned
    for (let message of firstMessages) {
        testResult = testing.assertValuesEqual(firstMessages.length, actualResponse.body.data.length)
        if (testResult !== true) return testResult;
        testResult = testing.assertListContainsMessage(actualResponse.body.data, message);
        if (testResult !== true) return testResult;
    }

    return testResult;
}

async function test_DirectMessage_FetchDirectMessages_AfterTime(servers, sharedData) {
    // Send 10 messages and fetch all that were sent after a certain time
    let infraServerUrl = servers.infrastructureServer;

    // Create a sender
    await createAccount(servers, sharedData);
    let sender = sharedData.account;
    // Create a recipient
    await createAccount(servers, sharedData);
    let recipient = sharedData.account;
    await getSession(servers, sharedData);
    await setPublicKey(servers, sharedData);
    let recipientPublicKey = sharedData.accountPublicKey;

    // Send first 5 messages
    let firstMessages = [];
    for (let i = 0; i < 5; i++) {
        firstMessages.push(await sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender));
    }

    // Wait 10 seconds, and then send the next 5 messages
    
    sleep(10);
    let timerEnd = Math.floor(Date.now() / 1000);

    let lastMessages = [];
    for (let i = 0; i < 5; i++) {
        lastMessages.push(await sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender));
    }

    // GetSession for recipient
    sharedData.account = recipient;
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    // Fetch messages from after the sleep timer began (i.e. the last 5 messages)
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.GET,
        {},
        {
            "Authorization": `Bearer ${jwt}`,
            "Start-Time": timerEnd
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    // Check if all the messages were returned
    for (let message of lastMessages) {
        testResult = testing.assertValuesEqual(lastMessages.length, actualResponse.body.data.length);
        if (testResult !== true) return testResult;
        testResult = testing.assertListContainsMessage(actualResponse.body.data, message);
        if (testResult !== true) return testResult;
    }

    return testResult;
}

async function test_DirectMessage_FetchDirectMessages_BetweenTimes(servers, sharedData) {
    // Send 15 messages and fetch all that were sent between certain times
    let infraServerUrl = servers.infrastructureServer;

    // Create a sender
    await createAccount(servers, sharedData);
    let sender = sharedData.account;
    // Create a recipient
    await createAccount(servers, sharedData);
    let recipient = sharedData.account;
    await getSession(servers, sharedData);
    await setPublicKey(servers, sharedData);
    let recipientPublicKey = sharedData.accountPublicKey;

    // Send first 5 messages
    let firstMessages = [];
    for (let i = 0; i < 5; i++) {
        firstMessages.push(await sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender));
    }

    // Wait 10 seconds, and then send the next 5 messages
    let firstTimerStart = Math.floor(Date.now() / 1000) + 1;  // Add 1 to make sure none of the firstMessages share the same timestamp due to occuring during the same second
    sleep(10);
    
    let middleMessages = [];
    for (let i = 0; i < 5; i++) {
        middleMessages.push(await sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender));
    }

    // Wait another 10 seconds, and then send the last 5 messages
    let secondTimerStart = Math.ceil(Date.now() / 1000);
    sleep(10);

    let lastMessages = [];
    for (let i = 0; i < 5; i++) {
        lastMessages.push(await sendDirectMessage(servers, sharedData, recipient, recipientPublicKey, sender));
    }
    

    // GetSession for recipient
    sharedData.account = recipient;
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    // Fetch messages from after the sleep timer began (i.e. the last 5 messages)
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        directMessagesEndpoint,
        testing.HTTP_METHODS.GET,
        {},
        {
            "Authorization": `Bearer ${jwt}`,
            "Start-Time": firstTimerStart,
            "End-Time": secondTimerStart
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    // Check if all the messages were returned
    for (let message of middleMessages) {
        testResult = testing.assertValuesEqual(middleMessages.length, actualResponse.body.data.length)
        if (testResult !== true) return testResult;
        testResult = testing.assertListContainsMessage(actualResponse.body.data, message);
        if (testResult !== true) return testResult;
    }

    return testResult;
}

export {
    tests_DirectMessage,
    tests_DirectMessage_SendDirectMessage,
    tests_DirectMessage_FetchDirectMessages
}