/*
    Constants for tests
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

export const accountsEndpoint = "/accounts";
export const sessionsEndpoint = "/sessions";
export const infrastructureServerCommunitiesEndpoint = "/communities";
export const infrastructureServerPublicKeyEndpoint = "/publicKey";
export const directMessagesEndpoint = "/DirectMessages"

export const communityServerPingEndpoint = "/ping";
export const postsEndpoint = "/posts";
