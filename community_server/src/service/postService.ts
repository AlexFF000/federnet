/*
    Logic for posts
*/

import Post from "../model/Post.js";
import * as postRepository from "../repository/postRepository.js";

export async function createPost(post: Post) {
    if (await postRepository.addPost(post)) {
        return "Success";
    } else {
        return "GenericFailure";
    }
}