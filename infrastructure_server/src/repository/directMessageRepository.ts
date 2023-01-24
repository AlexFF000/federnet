/*
    Database access logic for communities
*/

import { Collection, Db } from "mongodb";

import DirectMessage from "../model/DirectMessage.js";
import { MongoConnection } from "./MongoConnection.js";
import log from "../log.js";

const directMessagesCollection = "directMessages";

export async function addDirectMessage(message: DirectMessage): Promise<boolean> {
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(directMessagesCollection);

        await collection.insertOne(message);

        log.debug(`Added direct message`);
        return true;
    } catch (e) {
        log.error(e, "Failed to add direct message");
        return false;
    }
}

export async function getDirectMessages(recipientUsername: string, startTime: number, endTime: number): Promise<DirectMessage[]> {
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection<DirectMessage> = database.collection<DirectMessage>(directMessagesCollection);

        // Ensure startTime and endTime are numbers, as the MongoDB query won't return anything if strings are used
        if (typeof startTime === "string") startTime = parseInt(startTime);
        if (typeof endTime === "string") endTime = parseInt(endTime);

        let messages = await collection.find({ 
            "recipientUsername": recipientUsername,  // Where recipientUsername is equal to recipientUsername
            "timestamp": { "$gte": startTime, "$lte": endTime }  // Where timestamp is greater than or equal to startTime and less than or equal to endTime
        }, 
        {
            limit: 1000,  // Only return up to 1000 messages to avoid overloading
            projection: {
                "_id": 0  // Exclude id field
            }
        }).toArray();

        log.debug(`Fetched ${messages.length} Direct Messages`);
        return messages;
    } catch (e) {
        log.error(e, `Failed to get direct messages for ${recipientUsername} from between ${startTime} and ${endTime}`);
        return [];
    }
}