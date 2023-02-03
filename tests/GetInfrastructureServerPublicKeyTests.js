/*
    Test suite for testing GetInfrastructureServerPublicKey endpoint
*/

import { infrastructureServerPublicKeyEndpoint, RESPONSE_CODES } from "./constants.js";
import Response from "./Structures/Response.js";
import TestSet from "./Structures/TestSet.js";
import * as testing from "./testUtils.js";

let tests_GetInfrastructureServerPublicKey = new TestSet(test_GetInfrastructureServerPublicKey_Success);

async function test_GetInfrastructureServerPublicKey_Success(servers, sharedData) {
    let infraServerUrl = servers.infrastructureServer;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;
    
    let actualResponse = await testing.sendRequest(
        infraServerUrl,
        infrastructureServerPublicKeyEndpoint,
        testing.HTTP_METHODS.GET
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponseHasData(actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

export {
    tests_GetInfrastructureServerPublicKey
}