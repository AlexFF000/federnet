/*
    Community object
*/

export default class {
    name: string | null;
    description: string | null;
    address: string | null;
    publicKey: string | null;

    constructor() {
        // None of the fields will be used in all cases so all need to be nullable
        this.name = null;
        this.description = null;
        this.address = null;
        this.publicKey = null;
    }
}