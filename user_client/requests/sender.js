// Send requests to a server
const axios = require("axios");

const Response = require("./Response.js");

async function sendRequest(server, endpoint, method, body, headers={}) {
    // Send a request to a server
    let response;
    try {
        let axiosResponse = await axios({
            url: addPathToUrl(server, endpoint),
            method: method,
            data: body,
            headers: headers
        });

        response = parseResponse(axiosResponse);
    } catch (e) {
        // Axios will throw an error for any non 200 response status
        if (e.code === "ERR_BAD_REQUEST") {
            // A response was received but the status was not 200
            response = parseResponse(e.response);
        } else {
            // Something went wrong
            response = new Response();
            response.validResponseReceived = false;
            response.errorMessage = e.code;
        }
    }

    return response;
}

function addPathToUrl(url, path) {
    // Add path to URL, prefixed by a slash if the URL doesn't already have one on the end
    if (url.endsWith("/")) {
        url = url.slice(0, url.length - 1);
    }
    if (path.startsWith("/")) {
        path = path.slice(1, path.length);
    }

    return `${url}/${path}`;
}

function parseResponse(axiosResponse) {
    // Parse data from axios response object into our own response format
    let response = new Response();
    if (
        axiosResponse.data !== undefined 
        && Number.isInteger(parseInt(axiosResponse.data.code)) 
        && typeof axiosResponse.data.message === "string"
        && 0 < axiosResponse.data.message.length
    ) {
        // The response is in the Federnet response format
        response.validResponseReceived = true;

        response.code = axiosResponse.data.code;
        response.message = axiosResponse.data.message;
        if (axiosResponse.data.data instanceof Array && 0 < axiosResponse.data.data.length) {
            // The response contains data
            response.data = axiosResponse.data.data;
        }
    } else {
        // The response is not in the Federnet format
        response.validResponseReceived = false;
        response.errorMessage = "The response was not in the valid Federnet format";
    }

    return response;
}

module.exports = {
    sendRequest
};