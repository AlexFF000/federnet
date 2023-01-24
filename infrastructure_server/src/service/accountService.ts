/*
    Logic for account related functionality
*/
import bcrypt from 'bcrypt';
import jsonwebtoken from 'jsonwebtoken';
import * as dotenv from 'dotenv';

import log from "../log.js";
import Account from "../model/Account";
import * as accountRepository from "../repository/accountRepository.js";
import { KeypairSingleton } from "../KeypairSingleton.js";
import { IJwtPayload } from '../model/IJwtPayload.js';

dotenv.config({ path: './infrastructure_server/.env' });

const passwordRegex = new RegExp("^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$");  // At least 8 characters, consisting of at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character

// Number of seconds that tokens should be valid for
const tokenLifespan = process.env.SESSION_LIFESPAN !== undefined && !isNaN(parseInt(process.env.SESSION_LIFESPAN))
    ? parseInt(process.env.SESSION_LIFESPAN)
    : 900;  // Use 900s (15 minutes) if none specified in env vars

export async function createAccount(account: Account): Promise<string> {
    // Verify password meets complexity requirements
    if (account.password == null || !passwordRegex.test(new String(account.password).valueOf())) return "UnsuitablePassword";
    // Check if username is already taken
    if (await accountRepository.getAccount(account.username) !== null) return "UsernameNotUnique";

    // Hash the password
    account.password = await generatePasswordHash(account.password);

    // Create account
    if (await accountRepository.addAccount(account)) {
        return "Success";
    } else {
        return "GenericFailure";
    }
}

export function getAccount(username: string): Promise<Account | null> {
    return accountRepository.getAccount(username);
}

export async function getSession(account: Account): Promise<string> {
    try {
        // Get the account matching that username
        let storedAccount: Account | null = await accountRepository.getAccount(account.username);

        if (storedAccount == null) return "BadCredentials";  // No account exists with the given username

        // Check if password matches
        if (account.password == null || storedAccount.password == null || !await bcrypt.compare(account.password, storedAccount.password)) return "BadCredentials";

        // Create and sign JWT token
        let keypair = await KeypairSingleton.getInstance();
        let privateKey = keypair.privateKey.export({
            type: "pkcs8",
            format: "pem"
        });

        let payload = {
            "username": storedAccount.username
        };

        // jsonwebtoken doesn't return Promises, so use it inside a Promise
        return new Promise((resolve) => {
            jsonwebtoken.sign(payload, { key: privateKey, passphrase: keypair.privKeyPassphrase }, {
                algorithm: "RS256",
                expiresIn: tokenLifespan
            }, (err, token) => {
                if (err) {
                    log.error(err, "Error occurred in getSession");
                    resolve("GenericFailure");
                } else if (token === undefined) {
                    resolve("GenericFailure");
                } else {
                    resolve(token);
                }
            });
        });
    } catch (e) {
        log.error(e, "Error occurred in getSession");
        return "GenericFailure";
    }
}

export async function verifySession(token: string): Promise<boolean | IJwtPayload> {
    // Verify that token was signed by the infrastructure server (meaning user is authorised and authenticated)
    try {
        let keypair = await KeypairSingleton.getInstance();
        let publicKey = keypair.publicKey.export({
            type: "spki",
            "format": "pem"
        });

        // jsonwebtoken doesn't return Promises, so use it inside a Promise
        return new Promise((resolve) => {
            jsonwebtoken.verify(token, publicKey, (err, decoded) => {
                if (err) {
                    resolve(false);
                } else {
                    try {
                        let parsedPayload: IJwtPayload = parsePayload(decoded);
                        resolve(parsedPayload);
                    } catch (e) {
                        // Payload is malformed
                        resolve(false);
                    }
                }
            })
        });
    } catch (e) {
        log.error(e, "Error occurred in verifySession");
        return false;
    }
}

export async function setPublicKey(account: Account): Promise<string> {
    if (account.publicKey !== null && await accountRepository.updatePublicKey(account)) return "Success";
    else return "GenericFailure";
}

export async function getPublicKey(username: string) : Promise<string> {
    let account = await accountRepository.getAccount(username);

    if (account === null) return "UserNotFound";  // The specified user doesn't exist
    if (account.publicKey === null) return "NoPublicKey";
    else return account.publicKey;
}

function generatePasswordHash(password: string): Promise<string> {
    // Hash password with 10 salt rounds.  The resulting digest and salt will be stored in the same string
    return bcrypt.hash(password, 10);
}

function parsePayload(payload: any): IJwtPayload {
    if (payload.username !== undefined && typeof payload.username === "string") {
        return payload;
    } else {
        throw "Malformed JWt payload";
    }
}