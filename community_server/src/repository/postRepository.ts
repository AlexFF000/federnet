/*
    Database access logic for posts
*/

import { Collection, Db } from "mongodb";

import { postsCollection } from "../constants.js";
import log from "../log.js";
import Post from "../model/Post.js";
import { MongoConnection } from "./MongoConnection.js";

const PostsBatchLimit = 1000;  // Only return 1000 posts at a time to avoid overloading

export async function addPost(post: Post): Promise<boolean> {
    try {
        let database: Db = (await MongoConnection.getInstance()).database;
        let collection: Collection = database.collection(postsCollection);

        // Create index on timestamp if one doesn't already exist
        collection.createIndex({ timestamp: 1});  // 1 = ascending index

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

        // Only return up to PostsBatchLimit posts to avoid overloading.  These should be the last N posts before the end-time (rather than the first N after the start-time) as the user will be fetching the most recent posts first
        // Get the total number of posts matching the query so we can skip to the last N.  This count will use the index rather than needing to manually check the posts
        let postsMatchingQuery = await collection.count({
            "timestamp": {"$gte": startTime, "$lte": endTime}
        });

        let postsToSkip = PostsBatchLimit < postsMatchingQuery ? postsMatchingQuery - PostsBatchLimit : 0;

        let posts = await collection.find({ 
            "timestamp": { "$gte": startTime, "$lte": endTime }  // Where timestamp is greater than or equal to startTime and less than or equal to endTime
        }, 
        {
            projection: {
                "_id": 0  // Exclude id field
            },
            skip: postsToSkip
        }).toArray();

        log.debug(`Fetched ${posts.length} posts`);
        return posts;
    } catch (e) {
        log.error(e, `Failed to get posts from between ${startTime} and ${endTime}`);
        return [];
    }
}