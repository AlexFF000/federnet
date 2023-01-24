/*
    Direct Message object
*/
export default class {
    senderUsername: string;
    recipientUsername: string;
    content: string;
    timestamp: number;

    constructor(senderUsername: string, recipientUsername: string, content: string, timestamp: number) {
        this.senderUsername = senderUsername;
        this.recipientUsername = recipientUsername;
        this.content = content;
        this.timestamp = timestamp;
    }
}