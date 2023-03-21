// Federnet API requests related to communities and posts

const { sendRequest } = require("./sender.js");
const { ENDPOINTS, RESPONSE_CODES } = require("../constants.js");
const ConnectionParamsSingleton = require("../ConnectionParamsSingleton.js");

async function pingServer(address) {
    // Send ping request to community server and check if correct pong response received
    let response = await sendRequest(
        address, 
        ENDPOINTS.ping,
        "get"
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success && response.message !== undefined && response.message === "Pong") {
            // Received correct pong response.  The server is a Federnet community server.
            return true;
        }
    }
    return false;
}

async function fetchPosts(address, startTime=0, endTime) {
    // Fetch posts from between startTime and endTime from server
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let headers = {};
    headers.Authorization = `Bearer ${connectionParamsSingleton.getJwt()}`;
    headers["Start-Time"] = startTime;
    if (endTime !== undefined) headers["End-Time"] = endTime;

    let response = await sendRequest(
        address,
        ENDPOINTS.posts,
        "get",
        {},
        headers
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success) {
            if (response.data instanceof Array) {
                return response.data;
            }
        } else if (response.code === RESPONSE_CODES.UnauthorisedUserRequest) {
            // TODO Refresh token
        }
    }

    return [];
}

async function createPost(address, content) {
    // Send a new post to the community server
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let response = await sendRequest(
        address,
        ENDPOINTS.posts,
        "post",
        {
            content: content
        },
        {
            Authorization: `Bearer ${connectionParamsSingleton.getJwt()}`
        }
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success) {
            return "Success";
        } else if (response.code === RESPONSE_CODES.UnauthorisedUserRequest) {
            // TODO Refresh token
        }
    }
    return "Failed to send post";
}

async function fetchCommunities() {
    // Fetch list of communities from the Infrastructure Server
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let response = await sendRequest(
        connectionParamsSingleton.getInfrastructureServerUrl(),
        ENDPOINTS.communities,
        "get",
        {}
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success && response.data instanceof Array) {
            return response.data;
        }
    }

    return [];
}

module.exports = {
    pingServer,
    fetchPosts,
    createPost,
    fetchCommunities
}