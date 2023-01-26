/*
    Handlers for responding to requests raleting to posts
*/

import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance, FastifyPluginOptions } from "fastify";

import { postsEndpoint, RESPONSE_CODES } from "../constants.js";
import Post from "../model/Post.js";
import { authHeader, authoriseRequestJwt, tokenUsernameParam } from "./authorisation.js";
import * as postService from "../service/postService.js";
import Response from "../model/Response.js";

const createPostBody = Type.Object({
    content: Type.String()
});

const fetchPostsHeaders = Type.Object({
    "Authorization": Type.String(),
    "start-time": Type.Integer(),
    "end-time": Type.Optional(Type.Integer())
});

export default (server: FastifyInstance, opts: FastifyPluginOptions, done: CallableFunction) => {
    server.withTypeProvider<TypeBoxTypeProvider>();

    // CreatePost
    server.post<{Headers: Static<typeof authHeader>, Params: Static<typeof tokenUsernameParam>, Body: Static<typeof createPostBody>}>(postsEndpoint, {
        preHandler: authoriseRequestJwt
    }, async (req, res) => {
        let username = "";
        if (req.params.tokenUsername) username = req.params.tokenUsername;  // Always true but needed to satisfy TypeScript (see authoriseRequestJwt for more info)
        let post = new Post(username, Math.floor(Date.now() / 1000), req.body.content);

        let response: Response;
        if (await postService.createPost(post) === "Success") {
            response = new Response(RESPONSE_CODES.Success, "Successfully submitted post");
            res.code(200);
        } else {
            response = new Response(RESPONSE_CODES.GenericFailure, "Something went wrong while submitting post");
            res.code(500);
        }

        res.send(response);
    });

    // FetchPosts
    server.get<{Headers: Static<typeof fetchPostsHeaders>, Params: Static<typeof tokenUsernameParam>}>(postsEndpoint, {
        preHandler: authoriseRequestJwt
    }, async (req, res) => {
        // If no End-Time provided, use current timestamp
        let endTime: number;
        if (req.headers["end-time"] !== undefined) endTime = req.headers["end-time"];
        else endTime = Math.floor(Date.now() / 1000);

        let posts = await postService.fetchPosts(req.headers["start-time"], endTime);

        res.code(200);
        res.send(new Response(RESPONSE_CODES.Success, "Successfully fetched posts", posts));
    });

    done();
}