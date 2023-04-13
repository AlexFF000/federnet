// Federnet API requests related to accounts

const ConnectionParamsSingleton = require("../ConnectionParamsSingleton.js");
const { sendRequest } = require("./sender.js");
const { ENDPOINTS, RESPONSE_CODES } = require("../constants.js");

async function getSession() {
    // Use given login details to get a session token
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let infrastructureServer = connectionParamsSingleton.getInfrastructureServerUrl();
    let username = connectionParamsSingleton.getUsername();
    let password = connectionParamsSingleton.getPassword();

    let response = await sendRequest(
        infrastructureServer,
        ENDPOINTS.sessions,
        "post",
        {
            username: username,
            password: password
        }
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success) {
            // Credentials were correct, hold the JWT in ConnectionsParamsSingleton
            connectionParamsSingleton.setJwt(response.data[0]);
            return "Success";
        } else if (response.code === RESPONSE_CODES.BadCredentials) {
            // Incorrect credentials
            return "Incorrect username or password";
        } else {
            return "An unexpected error occurred"
        }
    } else {
        // Response from server was invalid, or server could not be contacted
        return response.errorMessage;
    }
}

async function createAccount() {
    // Use details in connectionParamsSingleton for the new account credentials
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let infrastructureServer = connectionParamsSingleton.getInfrastructureServerUrl();
    let username = connectionParamsSingleton.getUsername();
    let password = connectionParamsSingleton.getPassword();

    let response = await sendRequest(
        infrastructureServer,
        ENDPOINTS.accounts,
        "post",
        {
            username: username,
            password: password
        }
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success) {
            // Account created successfully
            return "Success";
        } else if (response.code === RESPONSE_CODES.UsernameNotUnique) {
            return "The username is already taken";
        } else if (response.code === RESPONSE_CODES.UnsuitablePassword) {
            return response.message;  // As per the spec, the message for unsuitablePassword responses must contain the password requirements, so just display this message
        } else {
            return "An unexpected error occurred";
        }
    } else {
        // Response from server was invalid, or server could not be contacted
        return response.errorMessage;
    }
}

async function setPublicKey(publicKey) {
    // Send a SetPublicKey request to change the user's public key
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let response = await sendRequest(
        connectionParamsSingleton.getInfrastructureServerUrl(),
        `${ENDPOINTS.accounts}/${connectionParamsSingleton.getUsername()}`,
        "put",
        {
            publicKey: publicKey
        },
        {
            Authorization: `Bearer ${connectionParamsSingleton.getJwt()}`
        }
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success) {
            return "Success";
        } else if (response.code === RESPONSE_CODES.UnauthorisedUserRequest) {
            // Refresh token
            if (await getSession() === "Success"){
                // Retry
                return await setPublicKey(publicKey);
            } else {
                return response.errorMessage;
            }
        }
    } else {
        return response.errorMessage;
    }
}

async function getPublicKey(username) {
    // Send a GetPublicKey request to get a user's public key
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let response = await sendRequest(
        connectionParamsSingleton.getInfrastructureServerUrl(),
        `${ENDPOINTS.accounts}/${username}`,
        "get"
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success) {
            return response.data[0];
        }
    }

    return null;
}

async function sendDirectMessage(username, encryptedContent) {
    // Send a SendDirectMessage request
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let response = await sendRequest(
        connectionParamsSingleton.getInfrastructureServerUrl(),
        ENDPOINTS.directMessages,
        "post",
        {
            content: encryptedContent,
            recipientUsername: username
        },
        {
            Authorization: `Bearer ${connectionParamsSingleton.getJwt()}`
        }
    );

    if (response.validResponseReceived) {
        if (response.code === RESPONSE_CODES.Success) {
            return "Success";
        } else if (response.code === RESPONSE_CODES.UserNotFound) {
            return "UserNotFound";
        } else if (response.code === RESPONSE_CODES.UnauthorisedUserRequest) {
            // Refresh token
            if (await getSession() === "Success") {
                // Retry
                return await sendDirectMessage(username, encryptedContent);
            } else {
                return "GenericFailure";
            }
        }
    } else {
        return "GenericFailure";
    }
}

async function fetchDirectMessages(startTime=0, endTime) {
    // Send a FetchDirectMessages request to fetch Direct Messages from the Infrastructure Server
    let connectionParamsSingleton = ConnectionParamsSingleton.getInstance();

    let headers = {};
    headers.Authorization = `Bearer ${connectionParamsSingleton.getJwt()}`;
    headers["Start-Time"] = startTime;
    if (endTime !== undefined) headers["End-Time"] = endTime;

    let response = await sendRequest(
        connectionParamsSingleton.getInfrastructureServerUrl(),
        ENDPOINTS.directMessages,
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
            // Refresh token
            if (await getSession() === "Success") {
                // Retry
                return await fetchDirectMessages(startTime, endTime);
            } else {
                console.log("Unable to fetch direct messages.  Access denied");
                return [];
            }
        }
    }

    return [];
}

module.exports = {
    getSession,
    createAccount,
    setPublicKey,
    getPublicKey,
    sendDirectMessage,
    fetchDirectMessages
}