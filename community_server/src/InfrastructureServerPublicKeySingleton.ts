/*
    Singleton for holding the Infrastructure Server's public key
*/
import { createHash } from "crypto";

import * as infrastructureServerService from "./service/infrastructureServerService.js";

export class InfrastructureServerPublicKeySingleton {
    private static instance: InfrastructureServerPublicKeySingleton;

    publicKey!: string;
    publicKeyHashDigest!: string;

    private constructor() {
        // Constructor must be private
    }

    static async getInstance() {
        if (InfrastructureServerPublicKeySingleton.instance == undefined) {
            // No instance exists yet, so create one
            let instance = new InfrastructureServerPublicKeySingleton();
            await instance.fetchKey();
            InfrastructureServerPublicKeySingleton.instance = instance;
            return instance;
        } else {
            // An instance already exists, so just return it
            return InfrastructureServerPublicKeySingleton.instance;
        }
    }

    async fetchKey() {
        let oldKey = "";
        if (this.publicKey !== undefined) oldKey = this.publicKey;

        // Fetch the key
        this.publicKey = await infrastructureServerService.getPublicKey();

        // To save (a tiny bit of) time, only bother doing the hashing if the key has changed
        if (this.publicKey !== oldKey) {
            this.hashKey();
        }    
    }

    private hashKey() {
        // Create MD5 hash of public key and represent as a base64 string
        let hash = createHash("md5");
        hash.update(this.publicKey);
        this.publicKeyHashDigest = hash.digest("base64");
    }


}