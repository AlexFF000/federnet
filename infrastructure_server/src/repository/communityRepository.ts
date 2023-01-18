/*
    Database access logic for communities
*/
import { Collection, Db } from "mongodb";

import { MongoConnection } from "./MongoConnection.js";
import Community from "../model/Community.js";
import log from "../log.js";

const communitiesCollection = "communities";

export async function addCommunity(community: Community): Promise<boolean> {
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(communitiesCollection);

        await collection.insertOne(community);

        log.debug(`Added community ${community.name}`);
        return true;
    } catch (e) {
        log.error(e, "Failed to add community");
        return false;
    }
}

export async function updateCommunity(currentName: string, community: Community): Promise<boolean> {
    try {
        log.debug(`Updating community ${currentName}`);
        // Find which fields have been provided for modification
        let updates = new Map();
        if (community.address !== null) updates.set("address", community.address);
        if (community.name !== null) updates.set("name", community.name);
        if (community.description !== null) updates.set("description", community.description);
        if (community.publicKey !== null) updates.set("publicKey", community.publicKey);

        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(communitiesCollection);

        await collection.updateOne({ "name": currentName }, {
            "$set": updates
        });

        return true;
    } catch (e) {
        log.error(e, `Failed to update community ${currentName}`);
        return false;
    }
}

export async function deleteCommunity(name: string): Promise<boolean> {
    try {
        log.debug(`Deleting community ${name}`);
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(communitiesCollection);

        await collection.deleteOne( { "name": name });
        return true;
    } catch (e) {
        log.error(e, `Failed to delete communtiy ${name}`);
        return false;
    }
}

export async function getCommunity(name: string): Promise<Community | null> {
    try {
        log.debug(`Fetching community ${name}`);
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(communitiesCollection);

        let communityInfo = await collection.findOne({ "name": name });

        if (communityInfo != null && communityInfo["name"] !== undefined && typeof communityInfo["name"] === "string") {
            let community: Community = new Community();
            community.name = communityInfo["name"];
            if (communityInfo["description"] !== undefined && typeof communityInfo["description"] === "string") community.description = communityInfo["description"];
            if (communityInfo["address"] !== undefined && typeof communityInfo["address"] === "string") community.address = communityInfo["address"];
            if (communityInfo["publicKey"] !== undefined && typeof communityInfo["publicKey"] === "string") community.publicKey = communityInfo["publicKey"];
            return community;
        } else {
            return null;
        }

    } catch (e) {
        log.error(e, "Failed to fetch community from database");
        return null;
    }
}

export async function getAllCommunities(): Promise<Community[]> {
    /*
        Note
        To avoid this having the potential to overload the server, this only returns up to 1000 communities at the moment
        If needed as the project scales, this will need to be re-designed (and specification updated appropriately) to allow communities to be fetched in batches
    */
    
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection<Community> = database.collection<Community>(communitiesCollection);

        return await collection.find({}, {
            limit: 1000,
            projection: {
                "_id": 0  // Exclude id field
            }
        }).toArray();
    } catch (e) {
        log.error(e, "Failed to fetch communities");
        return [];
    }
}