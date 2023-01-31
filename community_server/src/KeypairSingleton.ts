/*
    Singleton for generating, reading in, and accessing the keypair
*/
import * as dotenv from 'dotenv';
import { createPrivateKey, createPublicKey, generateKeyPair, KeyObject } from 'crypto';
import { promisify } from 'util';

import log from './log.js';
import { readFile, writeFile, copyFile } from 'fs/promises';

dotenv.config({ path: './community_server/.env' });

const generateKeyPairPromise = promisify(generateKeyPair);


class KeypairSingleton {
    private static instance: KeypairSingleton;

    private privKeyPath: string;
    privKeyPassphrase: string;

    publicKey!: KeyObject;
    privateKey!: KeyObject;

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
        let {publicKey, privateKey} = await this.generateNewKeys();
        await this.updateKeys(publicKey, privateKey);
    }

    public async generateNewKeys(): Promise<{publicKey: string, privateKey: string}> {
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

            return {publicKey, privateKey};
        } catch (e) {
            log.fatal(e, "Failed to generate keys");
            process.exit(1);
        }
    }

    public async updateKeys(publicKey: string, privateKey: string) {
        try {
            log.info(`Writing new private key to ${this.privKeyPath}`);
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
        } catch (e) {
            log.fatal(e, "Failed to store keys");
            process.exit(1);
        }
    }

    public async backupPrivateKey(): Promise<boolean> {
        try {
            // Create a backup copy of the private key file so a new key can be generated without losing the old one
            log.info(`Creating backup copy of private key`);
            let dest = `${this.privKeyPath}.old`;
            await copyFile(this.privKeyPath, dest);
            log.info(`Copied private key to ${dest}`);
            return true;
        } catch (e) {
            log.error(e, "Failed to backup private key");
            return false;
        }
    }
}

export { KeypairSingleton };