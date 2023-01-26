/*
    Database access logic for posts
*/

import { Collection, Db } from "mongodb";

import { postsCollection } from "../constants.js";
import log from "../log.js";
import Post from "../model/Post.js";
import { MongoConnection } from "./MongoConnection.js";

export async function addPost(post: Post): Promise<boolean> {
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(postsCollection);

        await collection.insertOne(post);

        log.debug(`Added post`);
        return true;
    } catch (e) {
        log.error(e, "Failed to add post");
        return false;
    }
}

export async function getPosts(startTime: number, endTime: number): Promise<Post[]> {
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection<Post> = database.collection<Post>(postsCollection);

        // Ensure startTime and endTime are numbers, as the MongoDB query won't return anything if strings are used
        if (typeof startTime === "string") startTime = parseInt(startTime);
        if (typeof endTime === "string") endTime = parseInt(endTime);

        let posts = await collection.find({ 
            "timestamp": { "$gte": startTime, "$lte": endTime }  // Where timestamp is greater than or equal to startTime and less than or equal to endTime
        }, 
        {
            limit: 1000,  // Only return up to 1000 posts to avoid overloading
            projection: {
                "_id": 0  // Exclude id field
            }
        }).toArray();

        log.debug(`Fetched ${posts.length} posts`);
        return posts;
    } catch (e) {
        log.error(e, `Failed to get posts from between ${startTime} and ${endTime}`);
        return [];
    }
}