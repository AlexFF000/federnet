// Response object
class Response {
    validResponseReceived;
    errorMessage;

    // These will only be set if responseReceived is true
    code;
    message;
    data;
}

module.exports = Response;