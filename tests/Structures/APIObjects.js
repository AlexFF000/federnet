/* 
    Classes for representing Account, Community, Post, DirectMessage

    These objects are standardised across different requests in the specification.
    We provide the data to the assertion functions using these objects to limit how much we have to modify the tests themselves if the objects in the specification are changed
*/

class Account {
    username;
    password;

    getDict() {
        // Return a dict containing any fields that are not undefined
        let fields = {};
        if (this.username !== undefined) fields.username = this.username;
        if (this.password !== undefined) fields.password = this.password;
        return fields;
    }
}

class Community {
    name;
    description;
    address;
    publicKey;

    getDict() {
        let fields = {};
        if (this.name !== undefined) fields.name = this.name;
        if (this.description !== undefined) fields.description = this.description;
        if (this.address !== undefined) fields.address = this.address;
        if (this.publicKey !== undefined) fields.publicKey = this.publicKey;
        return fields;
    }
}

export {
    Account,
    Community
};