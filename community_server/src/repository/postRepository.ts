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