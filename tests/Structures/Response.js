/*
    Class for responses from HTTP requests
    Responses are represented using this class rather than Axios' own one to avoid coupling the entire test suite to Axios' class (this makes it easier to change if Axios changes the format or we change to a different HTTP library in future)
*/

export default class  {
    // Indicates whether the request was actually sent and a response received
    sentSuccessfully;
    failureInfo;

    // Represents the actual contents of the response
    status;
    headers;
    body;

    constructor() {
        this.headers = {};
        this.body = {};
    }
}