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
        if (username !== undefined) fields.username = this.username;
        if (password !== undefined) fields.password = this.password;
        return fields;
    }
}

export {Account};