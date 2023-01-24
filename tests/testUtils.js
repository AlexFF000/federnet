/*
    Functions for use in API tests
*/
import axios from 'axios';
import { Agent } from 'https';
import jsonwebtoken from 'jsonwebtoken';
import assert from 'node:assert';

import Response from './Structures/Response.js';

const HTTP_METHODS = {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    DELETE: 'delete',
    PATCH: 'patch'
};

// Send request, and return a promise for an object representing the response.  If the test fails the object is still returned but with sentSuccessfully=false
async function sendRequest(server, endpoint, method, body, headers) {
    try {
        let response = await axios({
            "method": method,
            "url": createUrl(server, endpoint),
            "headers": headers,
            "data": body,
            "httpsAgent": new Agent({
                rejectUnauthorized: false,  // Allow self signed SSL certificates
            })
        });
        let responseObject = new Response();
        responseObject.status = response.status;
        responseObject.headers = response.headers;
        responseObject.body = response.data;
        responseObject.sentSuccessfully = true;
        return responseObject;
    } catch (e) {
        let responseObject = new Response();
        if (e.code === "ERR_BAD_REQUEST") {
            // Axios throws an error on 4xx response statuses, even though for our purposes they aren't really errors
            responseObject.status = e.response.status;
            responseObject.headers = e.response.headers;
            responseObject.body = e.response.data;
            responseObject.sentSuccessfully = true;
            return responseObject;
        } else {
            responseObject.sentSuccessfully = false;
            responseObject.failureInfo = e.code;
            return responseObject;
        }
    }
}

function createBody(dataObject, existingBody={}) {
    // Add the fields from this object to a body dict.  Overwrite existing fields if necessary
    existingBody = Object.assign({}, existingBody);  // Shallow copy
    return Object.assign(existingBody, dataObject);
}

function createUrl(server, endpoint) {
    return server + endpoint;
}

// Assertion functions

function assertValuesEqual(expected, actual) {
    if (expected === actual) return true;
    else return `Values are not equal.  Expected: ${expected} actual: ${actual}`;
}

function assertResponseReceived(response) {
    // Assert that the request was sent successfully, and a response was received
    if (response.sentSuccessfully) return true;
    else return `Error sending or receiving request: ${response.failureInfo}`;
}

function assertResponsesMatch(expectedResponse, actualResponse) {
    // Assert that the HTTP status, headers, and bodies of two response objects match
    if (expectedResponse.status !== actualResponse.status) return `Response statuses do not match.  Expected: ${expectedResponse.status}  Actual: ${actualResponse.status}`;

    // actualResponse must contain all the headers in expectedResponse, but can also contain additional headers and still be valid.  i.e. every header in expected must be in actual, but not every header in actual must be in expected
    for (let headerKey in expectedResponse.headers) {
        if (actualResponse.headers[headerKey] === undefined || actualResponse.headers[headerKey] !== expectedResponse.headers[headerKey]) return `Response headers do not match.  For ${headerKey} Expected: ${expectedResponse.headers[headerKey]} Actual: ${actualResponse.headers[headerKey]}`;
    }

    // actualResponse must contain all the body fields in expectedResponse, but can also contain additional fields and still be valid
    for (let fieldKey in expectedResponse.body) {
        if (actualResponse.body[fieldKey] === undefined || actualResponse.body[fieldKey] !== expectedResponse.body[fieldKey]) return `Response bodies do not match.  For ${fieldKey} Expected: ${expectedResponse.body[fieldKey]} Actual: ${actualResponse.body[fieldKey]}`;
    }
    return true;
}

function assertJwtUsernameMatches(jwt, username) {
    try {
        let decoded = jsonwebtoken.decode(jwt);
        if (decoded.username !== username) return `Expected username and username in Jwt payload do not match.  Expected: ${username} Actual: ${decoded.payload.username}`;
        return true;
    } catch (e) {
        return `Unable to decode Jwt: ${e.message}`;
    }
}

function assertObjectsEqual(expected, actual) {
    try {
        assert.deepStrictEqual(actual, expected);
        return true;
    } catch (e) {
        return `Expected and Actual are not equal`;
    }
}

function assertListContains(itemsList, item) {
    // Assert that itemsList contains item as one of its elements
    if (itemsList instanceof Array) {
        for (let i of itemsList) {
            try {
                assert.deepStrictEqual(i, item);
                // If the items match, then the item does exist in the list
                return true;
            } catch (e) {
                continue;
            }
        }
        // None of the items matched
        return `Item is not present in itemsList`;
    } else return `itemsList is not a list`;
}

function assertListContainsMessage(messagesList, message) {
    // Specialised version of assertListContains for messages.  Only checks the recipient username and message content, as the other fields won't be known by the sender
    if (messagesList instanceof Array) {
        for (let m of messagesList) {
            if (m.recipientUsername === message.recipientUsername && m.content === message.content) return true;  // Found the correct message
        }
        // None of the messages matches
        return `Message is not present in messagesList`;
    } else return `messagesList is not a list`;
}


export {
    HTTP_METHODS,
    sendRequest,
    createBody,
    assertValuesEqual,
    assertResponseReceived,
    assertResponsesMatch,
    assertJwtUsernameMatches,
    assertObjectsEqual,
    assertListContains,
    assertListContainsMessage
}