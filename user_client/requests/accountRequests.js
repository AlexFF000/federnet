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

module.exports = {
    getSession,
    createAccount
}