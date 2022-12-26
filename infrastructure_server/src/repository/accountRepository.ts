/*
    Database access logic for accounts
*/
import { Collection, Db } from "mongodb";

import log from "../log.js";
import Account from "../model/Account.js";
import { MongoConnection } from "./MongoConnection.js";

const accountsCollection = "accounts";

export async function addAccount(account : Account): Promise<boolean> {
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(accountsCollection);

        await collection.insertOne(account);

        log.debug(`Added account ${account.username}`);
        return true; 
    } catch (e) {
        log.error(e, "Failed to add account");
        return false;
    }
}

export async function getAccount(username: string): Promise<Account | null> {
    try {
        log.debug(`Fetching account ${username}`);
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(accountsCollection);

        let accountInfo = await collection.findOne({ "username": username });

        if (accountInfo != null && accountInfo["username"] !== undefined && typeof accountInfo["username"] === "string") {
            let account = new Account(accountInfo["username"]);
            if (accountInfo["password"] !== undefined && typeof accountInfo["password"] === "string") account.password = accountInfo["password"];
            if (accountInfo["publicKey"] !== undefined && typeof accountInfo["publicKey"] === "string") account.publicKey = accountInfo["publicKey"];
            return account;
        } else {
            return null;
        }
    } catch(e) {
        log.error(e, "Failed to fetch account from database");
        return null;
    }
}

export async function updatePublicKey(account: Account): Promise<boolean> {
    try {
        log.debug(`Updating public key for ${account.username}`);
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(accountsCollection);

        await collection.updateOne({ "username": account.username }, {
            "$set": {
                "publicKey": account.publicKey
            }
        });

        return true;
    } catch (e) {
        log.error(e, `Failed to update public key for ${account.username}`);
        return false;
    }
}