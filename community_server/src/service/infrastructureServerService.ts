/*
    Logic for functionality relating to the Infrastructure Server
*/
import { readFile } from 'fs/promises';
import jsonwebtoken from 'jsonwebtoken';

import { IJwtPayload } from "../model/IJwtPayload";


// TODO FNT-27 Replace this with the mechanism for fetching the public key from the Infrastructure Server.  THIS IS A HACK THAT WILL ONLY WORK ON MY MACHINE
import { createPrivateKey, createPublicKey } from 'crypto';
let importedPrivKey = await readFile("./infrastructure_server/keys/priv_key.pem", {
    encoding: "utf-8"
});
let privKeyObject = createPrivateKey({
    key: importedPrivKey, 
    format: "pem",
    passphrase: "password",
});
let publicKeyTEMP = createPublicKey(privKeyObject).export({type: "spki", format: "pem"});

export async function verifyToken(token: string): Promise<IJwtPayload | false> {
    // Verify JWT
    // jsonwebtoken doesn't return Promises, so use it inside a Promise
    return new Promise((resolve) => {
        jsonwebtoken.verify(token, publicKeyTEMP, (err, decoded) => {
            if (err) {
                // Invalid token
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
        });
    });
}

function parsePayload(payload: any): IJwtPayload {
    if (payload.username !== undefined && typeof payload.username === "string") {
        return payload;
    } else {
        throw "Malformed JWt payload";
    }
}