/*
    Singleton for generating, reading in, and accessing the keypair
*/
import * as dotenv from 'dotenv';
import { createHash, createPrivateKey, createPublicKey, generateKeyPair, KeyObject } from 'crypto';
import { promisify } from 'util';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

import log from './log.js';

dotenv.config({ path: './infrastructure_server/.env' });

const generateKeyPairPromise = promisify(generateKeyPair);


class KeypairSingleton {
    private static instance: KeypairSingleton;

    private privKeyPath: string;
    privKeyPassphrase: string;

    publicKey!: KeyObject;
    privateKey!: KeyObject;

    publicKeyHashDigest!: string;

    private constructor() {
        // Verify environment variables are provided
        if (process.env.PRIV_KEY_FILE === undefined || typeof process.env.PRIV_KEY_FILE !== "string" || process.env.PRIV_KEY_FILE === "") {
            log.fatal("No private key file path provided in PRIV_KEY_FILE environment variable");
            process.exit(1);
        }
        if (process.env.PRIV_KEY_PASSPHRASE === undefined || typeof process.env.PRIV_KEY_PASSPHRASE !== "string" || process.env.PRIV_KEY_PASSPHRASE === "") {
            log.fatal("No private key passphrase provided in PRIV_KEY_PASSPHRASE environment variable");
            process.exit(1);
        }

        this.privKeyPath = process.env.PRIV_KEY_FILE;
        this.privKeyPassphrase = process.env.PRIV_KEY_PASSPHRASE;
    }

    static async getInstance(): Promise<KeypairSingleton> {
        if (KeypairSingleton.instance == undefined) {
            // No existing instance, create one
            let instance = new KeypairSingleton();
            await instance.importKeys();
            KeypairSingleton.instance = instance;
            return KeypairSingleton.instance;
        } else {
            // Return the existing instance
            return KeypairSingleton.instance;
        }
    }

    private async importKeys() {
        // Import private key from file, and calculate the public key from it
        try {
            log.info(`Importing private key from ${this.privKeyPath}`);
            let importedPrivKey = await readFile(this.privKeyPath, {
                encoding: "utf-8"
            });

            // Convert to crypto's KeyObject format
            let privKeyObject = createPrivateKey({
                key: importedPrivKey, 
                format: "pem",
                passphrase: this.privKeyPassphrase,
            });

            // Generate public key from priv key
            this.publicKey = createPublicKey(privKeyObject);
            this.privateKey = privKeyObject;
            this.hashPublicKey();
            log.info("Key import successful");
        } catch (e: any) {
            if (e.code !== undefined && e.code === "ENOENT") {
                log.warn("Private key file does not exist, attempting to generate new private key");
                await this.generate();
            } else {
                log.fatal(e, "Failed to import private key and calculate public key");
            }
        }
    }

    private async generate() {
        // Generate and store keypair
        try {
            log.info("Generating new KeyPair");
            const { publicKey, privateKey } = await generateKeyPairPromise("rsa", {
                modulusLength: 4096,
                publicKeyEncoding: {
                    type: "spki",
                    format: "pem"
                },
                privateKeyEncoding: {
                    type: "pkcs8",
                    format: "pem",
                    cipher: "aes-256-cbc",
                    passphrase: this.privKeyPassphrase
                }
            });

            log.info(`Writing new private key to ${this.privKeyPath}`);

            // Ensure directory exists so file can be created if needed
            await mkdir(dirname(this.privKeyPath), {
                recursive: true
            });
            
            // Write private key to file
            await writeFile(this.privKeyPath, privateKey, {
                flag: "w",
                encoding: "utf-8"
            });
            log.info(`New private key written to ${this.privKeyPath}`);
            
            this.privateKey = createPrivateKey({
                key: privateKey,
                format: "pem",
                passphrase: this.privKeyPassphrase
            });

            this.publicKey = createPublicKey(publicKey);

            this.hashPublicKey();

        } catch (e) {
            log.fatal(e, "Failed to generate and store keys");
            process.exit(1);
        }
    }

    private hashPublicKey() {
        // Generate MD5 hash digest of public key represented as a base64 string
        let hash = createHash("md5");
        let publicKeyString = this.publicKey.export(
            {
                type: "spki",
                format: "pem"
            }
        );
        hash.update(publicKeyString);
        this.publicKeyHashDigest = hash.digest("base64");
    }
}

export { KeypairSingleton };