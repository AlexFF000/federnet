const ENDPOINTS = {
    // Infrastructure server
    sessions: "/sessions",
    accounts: "/accounts",
    communities: "/communities",
    directMessages: "/DirectMessages",

    // Community server
    ping: "/ping",
    posts: "/posts"
}

const RESPONSE_CODES = {
    Success: 0,
    GenericFailure: 1,
    UsernameNotUnique: 2,
    UnsuitablePassword: 3,
    BadCredentials: 4,
    UserNotFound: 5,
    NoPublicKey: 6,
    CommunityNameNotUnqiue: 7,
    UnsuitableAddress: 8,
    UnauthorisedCommunityRequest: 9,
    CommunityNotFound: 10,
    StaleRequest: 11,
    UnauthorisedUserRequest: 12
}

module.exports = {
    ENDPOINTS,
    RESPONSE_CODES
}