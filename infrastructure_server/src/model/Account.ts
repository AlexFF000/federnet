/*
    Account object
*/

export default class {
    username: string;
    password: string | null;
    publicKey: string | null;

    constructor(username: string) {
        this.username = username;
        // Password and public key won't always be provided when working with account data
        this.password = null;
        this.publicKey = null;
    }
}