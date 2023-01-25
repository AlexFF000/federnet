/*
    Test suite for testing post related functionality
*/
import { randomUUID } from "crypto";

import * as testing from "./testUtils.js";
import { postsEndpoint, RESPONSE_CODES } from "./constants.js";
import { createAccount, getSession, sleep } from "./helpers.js";
import TestSet from "./Structures/TestSet.js";
import { Post } from "./Structures/APIObjects.js";
import Response from "./Structures/Response.js";

let tests_Post = [];

// CreatePost tests
let tests_Post_CreatePost = new TestSet(test_Post_CreatePost_UnauthorisedUserRequest, test_Post_CreatePost_Success);
tests_Post_CreatePost.runBeforeAll(createAccount);  // Create an account to create the posts with

async function test_Post_CreatePost_UnauthorisedUserRequest(servers, sharedData) {
    // Try to send post the server with an invalid JWT and check UnauthorisedUserRequest response is sent back
    let comServerUrl = servers.communityServer;
    // Get a valid JWT and then modify it to be illegitimate but correctly formatted
    await getSession(servers, sharedData);
    let modifiedJwt = `${sharedData.jwt.substr(0, Math.floor(sharedData.jwt.length / 2))}a${sharedData.jwt.substr(Math.floor(sharedData.jwt.length / 2))}`; // Add an extra letter "a" in the middle of the token string

    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.UnauthorisedUserRequest;

    let post = new Post();
    post.content = `This post was automatically generated as part of an automated test, test_CreatePost_UnauthorisedUserRequest ${randomUUID()}`;

    let actualResponse = await testing.sendRequest(
        comServerUrl,
        postsEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody(
            post
        ),
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

async function test_Post_CreatePost_Success(servers, sharedData) {
    let comServerUrl = servers.communityServer;
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;  // 200 Ok
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let post = new Post();
    post.content = `This post was automatically generated as part of an automated test, test_CreatePost_Success ${randomUUID()}`;

    let actualResponse = await testing.sendRequest(
        comServerUrl,
        postsEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody(
            post
        ),
        {
            "Authorization": `Bearer ${jwt}`
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

// FetchPosts tests
let tests_Post_FetchPosts = new TestSet(test_Post_FetchPosts_UnauthorisedUserRequest, test_Post_FetchPosts_All, test_Post_FetchPosts_BeforeTime, test_Post_FetchPosts_AfterTime, test_Post_FetchPosts_BetweenTimes);
tests_Post_FetchPosts.runBeforeAll(createAccount);  // Create an account to create and fetch the posts with

async function createPost(servers, sharedData, poster) {
    // Create a post
    let comServerUrl = servers.communityServer;
    let post = new Post();
    post.posterUsername = poster.username;
    post.content = `This post was generated as part of an automated test.  ${randomUUID()}`;

    // Preserve existing sharedData values
    let currentAccount = sharedData.account;
    let currentJwt = sharedData.jwt;
    // Get session for poster
    sharedData.account = poster;
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    // Send post
    await testing.sendRequest(
        comServerUrl,
        postsEndpoint,
        testing.HTTP_METHODS.POST,
        testing.createBody(
            post
        ),
        {
            "Authorization": `Bearer ${jwt}`
        }
    );

    // Restore old sharedData values
    sharedData.account = currentAccount;
    sharedData.jwt = currentJwt;

    return post;
}

async function test_Post_FetchPosts_UnauthorisedUserRequest(servers, sharedData) {
    // Try to fetch posts but use an invalid JWT and check Unauthorised response is sent back
    let comServerUrl = servers.communityServer;
    await getSession(servers, sharedData);
    let modifiedJwt = `${sharedData.jwt.substr(0, Math.floor(sharedData.jwt.length / 2))}a${sharedData.jwt.substr(Math.floor(sharedData.jwt.length / 2))}`; // Add an extra letter "a" in the middle of the token string
    
    let expectedResponse = new Response();
    expectedResponse.status = 401;  // 401 Unauthorized
    expectedResponse.body.code = RESPONSE_CODES.UnauthorisedUserRequest;

    let actualResponse = await testing.sendRequest(
        comServerUrl,
        postsEndpoint,
        testing.HTTP_METHODS.GET,
        {},
        {
            "Authorization": `Bearer ${modifiedJwt}`,
            "Start-Time": 0
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    return testResult;
}

async function test_Post_FetchPosts_All(servers, sharedData) {
    // Create 10 posts and fetch all of them
    let comServerUrl = servers.communityServer;

    let submittedPosts = [];
    for (let i = 0; i < 10; i++) {
        submittedPosts.push(await createPost(servers, sharedData, sharedData.account));
    }

    // Create a different account for fetching the posts than for submitting them to check that users can see other users' posts
    await createAccount(servers, sharedData);
    // Get session
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(
        comServerUrl,
        postsEndpoint,
        testing.HTTP_METHODS.GET,
        {},
        {
            "Authorization": `Bearer ${jwt}`,
            "Start-Time": 0
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    // Check if all the posts were returned
    for (let post of submittedPosts) {
        testResult = testing.assertListContainsPost(actualResponse.body.data, post);
        if (testResult !== true) return testResult;
    }

    return testResult;
}

async function test_Post_FetchPosts_BeforeTime(servers, sharedData) {
    // Create 20 posts and fetch all that were created before a certain time
    let comServerUrl = servers.communityServer;

    // Create first 10 posts
    let firstPosts = [];
    for (let i = 0; i < 10; i++) {
        firstPosts.push(await createPost(servers, sharedData, sharedData.account));
    }

    let timerStart = Math.floor(Date.now() / 1000);
    // Sleep for 10 seconds
    sleep(10);

    // Create another 10 posts

    let lastPosts = [];
    for (let i = 0; i < 10; i++) {
        lastPosts.push(await createPost(servers, sharedData, sharedData.account));
    }

    // Create a different account for fetching the posts than for submitting them to check that users can see other users' posts
    await createAccount(servers, sharedData);
    // Get session
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(
        comServerUrl,
        postsEndpoint,
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

    // Check if all the first posts were returned
    for (let post of firstPosts) {
        testResult = testing.assertListContainsPost(actualResponse.body.data, post);
        if (testResult !== true) return testResult;
    }
    // Check that the second set of posts were not returned
    for (let post of lastPosts) {
        testResult = testing.assertListNotContainsPost(actualResponse.body.data, post);
        if (testResult !== true) return testResult;
    }

    return testResult;
}

async function test_Post_FetchPosts_AfterTime(servers, sharedData) {
    // Create 20 posts and fetch all that were created after a certain time
    let comServerUrl = servers.communityServer;

    // Create first 10 posts
    let firstPosts = [];
    for (let i = 0; i < 10; i++) {
        firstPosts.push(await createPost(servers, sharedData, sharedData.account));
    }

    // Sleep for 10 seconds
    sleep(10);
    let timerEnd = Math.floor(Date.now() / 1000);
    // Create another 10 posts

    let lastPosts = [];
    for (let i = 0; i < 10; i++) {
        lastPosts.push(await createPost(servers, sharedData, sharedData.account));
    }

    // Create a different account for fetching the posts than for submitting them to check that users can see other users' posts
    await createAccount(servers, sharedData);
    // Get session
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(
        comServerUrl,
        postsEndpoint,
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

    // Check that none of the first posts were returned
    for (let post of firstPosts) {
        testResult = testing.assertListNotContainsPost(actualResponse.body.data, post);
        if (testResult !== true) return testResult;
    }
    // Check that the second set of posts were all returned
    for (let post of lastPosts) {
        testResult = testing.assertListContainsPost(actualResponse.body.data, post);
        if (testResult !== true) return testResult;
    }

    return testResult;
}

async function test_Post_FetchPosts_BetweenTimes(servers, sharedData) {
    // Create 30 posts and fetch all that were created between certain times
    let comServerUrl = servers.communityServer;

    // Create first 10 posts
    let firstPosts = [];
    for (let i = 0; i < 10; i++) {
        firstPosts.push(await createPost(servers, sharedData, sharedData.account));
    }

    // Sleep for 10 seconds
    sleep(10);
    let firstTimerEnd = Math.floor(Date.now() / 1000);
    // Create another 10 posts

    let middlePosts = [];
    for (let i = 0; i < 10; i++) {
        middlePosts.push(await createPost(servers, sharedData, sharedData.account));
    }

    // Sleep for another 10 seconds
    let secondTimerStart = Math.floor(Date.now() / 1000);
    sleep(10);

    // Create last 10 posts
    let lastPosts = [];
    for (let i = 0; i < 10; i++) {
        lastPosts.push(await createPost(servers, sharedData, sharedData.account));
    }

    // Create a different account for fetching the posts than for submitting them to check that users can see other users' posts
    await createAccount(servers, sharedData);
    // Get session
    await getSession(servers, sharedData);
    let jwt = sharedData.jwt;

    let expectedResponse = new Response();
    expectedResponse.status = 200;
    expectedResponse.body.code = RESPONSE_CODES.Success;

    let actualResponse = await testing.sendRequest(
        comServerUrl,
        postsEndpoint,
        testing.HTTP_METHODS.GET,
        {},
        {
            "Authorization": `Bearer ${jwt}`,
            "Start-Time": firstTimerEnd,
            "End-Time": secondTimerStart
        }
    );

    let testResult = testing.assertResponseReceived(actualResponse);
    if (testResult !== true) return testResult;
    testResult = testing.assertResponsesMatch(expectedResponse, actualResponse);
    if (testResult !== true) return testResult;

    // Check that none of the first posts were returned
    for (let post of firstPosts) {
        testResult = testing.assertListNotContainsPost(actualResponse.body.data, post);
        if (testResult !== true) return testResult;
    }
    // Check that the second set of posts were all returned
    for (let post of middlePosts) {
        testResult = testing.assertListContainsPost(actualResponse.body.data, post);
        if (testResult !== true) return testResult;
    }
    // Check that none of the last posts were returned
    for (let post of lastPosts) {
        testResult = testing.assertListNotContainsPost(actualResponse.body.data, post);
        if (testResult !== true) return testResult;
    } 

    return testResult;
}

tests_Post = [tests_Post_CreatePost, tests_Post_FetchPosts];

export {
    tests_Post,
    tests_Post_CreatePost,
    tests_Post_FetchPosts
}