// Singleton for parameters needed for the connection to the Infrastructure Server

class ConnectionParamsSingleton {
    static _instance;

    _infrastructureServerUrl;
    _username;
    _password;
    _jwt;

    static getInstance() {
        if (ConnectionParamsSingleton._instance !== undefined) {
            // An instance has already been created, return it
            return ConnectionParamsSingleton._instance;
        } else {
            // No existing instance, create one
            ConnectionParamsSingleton._instance = new ConnectionParamsSingleton();
            return ConnectionParamsSingleton._instance;
        }
    }

    setInfrastructureServerUrl(url) {
        this._infrastructureServerUrl = url;
    }

    getInfrastructureServerUrl() {
        return this._infrastructureServerUrl;
    }

    setUsername(username) {
        this._username = username;
    }

    getUsername() {
        return this._username;
    }

    setPassword(password) {
        this._password = password;
    }

    getPassword() {
        return this._password;
    }

    setJwt(jwt) {
        this._jwt = jwt;
    }

    getJwt() {
        return this._jwt;
    }
}

module.exports = ConnectionParamsSingleton;