/*
    Constants used in multiple parts of the application
*/
export const RESPONSE_CODES = {
    Success: 0,
    GenericFailure: 1,
    UsernameNotUnique: 2,
    UnsuitablePassword: 3,
    BadCredentials: 4,
    UserNotFound: 5,
    NoPublicKey: 6,
    CommunityNameNotUnique: 7,
    UnsuitableAddress: 8,
    UnauthorisedCommunityRequest: 9,
    CommunityNotFound: 10,
    StaleRequest: 11,
    UnauthorisedUserRequest: 12
}

// Endpoints
export const pingEndpoint = "/ping";
export const postsEndpoint = "/posts";

// MongoDB collections
export const postsCollection = "posts";