/*
    Interface defining Jwt payload
*/

interface IJwtPayload {
    username: string,
    publicKeyHash: string
}

export { IJwtPayload }