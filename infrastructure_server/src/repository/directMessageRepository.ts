/*
    Database access logic for communities
*/

import { Collection, Db } from "mongodb";

import DirectMessage from "../model/DirectMessage.js";
import { MongoConnection } from "./MongoConnection.js";
import log from "../log.js";

const directMessagesCollection = "directMessages";

const MessagesBatchLimit = 1000;  // Only return 1000 messages at a time to avoid overloading

export async function addDirectMessage(message: DirectMessage): Promise<boolean> {
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(directMessagesCollection);

        // Create indexes on timestamp and recipientUsername if they don't already exist
        collection.createIndex({ timestamp: 1 });  // 1 = ascending index
        collection.createIndex({ recipientUsername: 1 });

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

        // Only return up to MessagesBatchLimit messages to avoid overloading.  These should be the last N messages before the end-time (rather than the first N after the start-time) as the user will be fetching the most recent messages first
        // Get the total number of messages matching the query so we can skip to the last N.  This count will use the index rather than needing to manually check the messages
        let messagesMatchingQuery = await collection.count({
            "recipientUsername": recipientUsername,
            "timestamp": {"$gte": startTime, "$lte": endTime}
        });

        let messagesToSkip = MessagesBatchLimit < messagesMatchingQuery ? messagesMatchingQuery - MessagesBatchLimit : 0;

        let messages = await collection.find({ 
            "recipientUsername": recipientUsername,  // Where recipientUsername is equal to recipientUsername
            "timestamp": { "$gte": startTime, "$lte": endTime }  // Where timestamp is greater than or equal to startTime and less than or equal to endTime
        }, 
        {
            limit: 1000,  // Only return up to 1000 messages to avoid overloading
            projection: {
                "_id": 0  // Exclude id field
            },
            skip: messagesToSkip
        }).toArray();

        log.debug(`Fetched ${messages.length} Direct Messages`);
        return messages;
    } catch (e) {
        log.error(e, `Failed to get direct messages for ${recipientUsername} from between ${startTime} and ${endTime}`);
        return [];
    }
}