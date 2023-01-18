/*
    Logic for community related functionality
*/
import axios from 'axios';
import { RESPONSE_CODES } from '../constants.js';

import Community from "../model/Community.js";
import * as communityRepository from "../repository/communityRepository.js";
import log from '../log.js';
import { createPublicKey, createVerify } from 'crypto';

export async function registerCommunity(community: Community): Promise<string> {
    // Check if name is already taken
    if (community.name === null || await communityRepository.getCommunity(community.name) !== null) return "CommunityNameNotUnique";
    
    // Check if address is an actual Federnet community server
    if (community.address !== null && await pingCommunityServer(community.address) !== true) return "UnsuitableAddress";
    
    if (await communityRepository.addCommunity(community)) {
        return "Success";
    } else {
        return "GenericFailure";
    }
}

export async function updateCommunity(currentName: string, community: Community): Promise<string> {
    // Update the stored community with the values in community

    // Check if specified community exists
    if (await communityRepository.getCommunity(currentName) === null) return "CommunityNotFound";
    // If community name is being updated, make sure there isn't already a community with that name
    if (community.name !== null && await communityRepository.getCommunity(community.name) !== null) return "CommunityNameNotUnique";
    // If address is being updated, make sure it points to a community server
    if (community.address !== null && await pingCommunityServer(community.address) !== true) return "UnsuitableAddress";
    
    if (await communityRepository.updateCommunity(currentName, community)) {
        return "Success";
    } else {
        return "GenericFailure";
    }
}

export async function removeCommunity(communityName: string) {
    if (await communityRepository.deleteCommunity(communityName)) {
        return "Success";
    } else {
        return "GenericFailure";
    }
}

export async function getCommunity(communityName: string): Promise<Community | null> {
    return communityRepository.getCommunity(communityName);
}

export async function fetchCommunities(): Promise<Community[]> {
    return communityRepository.getAllCommunities();
}

export async function verifySignature(communityName: string, requestBodyString: string, signature: string): Promise<string> {
    // Verify that signature represents requestBodyString hashed and encrypted with the given community's private key
    try {
        let community = await communityRepository.getCommunity(communityName);
        if (community !== null && community.publicKey !== null) {
            // Verify signature
            let publicKey = createPublicKey(community.publicKey);
            let verifier = createVerify("RSA-SHA256");
            verifier.update(requestBodyString, "utf8");
            if (verifier.verify(publicKey, signature, "base64")) {
                // The signature matches
                return "Success";
            } else {
                return "UnauthorisedCommunityRequest"
            }
        } else {
            return "CommunityNotFound";
        }
    } catch (e) {
        log.error(e, "Error occurred in verifySignature");
        return "GenericFailure";
    }
}

async function pingCommunityServer(address: string): Promise<boolean> {
    // Send ping request to a Community Server and check if a correct pong response is received
    try {
        let response = await axios({
            "method": "get",
            "url": addPathToUrl(address, "/ping"),
        });

        if (response.data.code !== undefined && response.data.code == RESPONSE_CODES.Success && response.data.message !== undefined && response.data.message == "Pong") return true;
        return false;
    } catch (e) {
        return false;
    }
}

function addPathToUrl(url: string, path: string) {
    // Add path to URL, prefixed by a slash if the URL doesn't already have one on the end
    if (url.endsWith("/")) {
        url = url.slice(0, url.length - 1);
    }
    if (path.startsWith("/")) {
        path = path.slice(1, path.length);
    }

    return `${url}/${path}`;
}