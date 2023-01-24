/*
    Logic for direct message related functionality
*/

import DirectMessage from "../model/DirectMessage.js";
import * as directMessageRepository from "../repository/directMessageRepository.js";
import * as accountService from "./accountService.js"

export async function sendDirectMessage(message: DirectMessage): Promise<string> {
    // Check recipient exists
    let recipient = await accountService.getAccount(message.recipientUsername);
    if (recipient === null) return "UserNotFound";
    // If the recipient has not setup a public key, they cannot receive direct messages
    if (recipient.publicKey === null) return "NoPublicKey";
    
    if (await directMessageRepository.addDirectMessage(message)) {
        return "Success";
    } else {
        return "GenericFailure";
    }
}

export async function fetchDirectMessages(recipientUsername: string, startTime: number, endTime: number): Promise<DirectMessage[]> {
    return directMessageRepository.getDirectMessages(recipientUsername, startTime, endTime);
}