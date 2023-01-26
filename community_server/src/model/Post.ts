/*
    Post object
*/

export default class {
    posterUsername: string;
    timestamp: number;
    content: string;

    constructor(posterUsername: string, timestamp: number, content: string) {
        this.posterUsername = posterUsername;
        this.timestamp = timestamp;
        this.content = content;
    }
}