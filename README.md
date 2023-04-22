# FederNet
For social media users who are concerned about tech companies having too much control over online discussion, FederNet is a social network that spreads discussion across servers run by different operators to limit any one entity’s control.

Supervisor: David Walker
## Disclaimer
Federnet was built as a final year undergraduate project, by a single student in a tight timeframe.  It is intended as a technical experiment into alternative approaches to social media rather than as a serious platform.  No guarantees are made relating to the security of the implementation.  Although all the security measures in the specification have been implemented, they may not have been implemented well.  The user client in particular contains some questionable security decisions which were made due to time pressure.
## Overview
Federnet is built around the concept of *communities*.  When you make a post, you post it to a community of your choice.
Anyone can start a new community, but to do so they must host it themselves on a *community server*.  This means that the central operator running the network can't delete posts from the network.

To ensure that potentially unscrupulous community operators can't access your password, accounts and authentication are handled by the *infrastructure server* provided by the central operator.  The infrastructure server also hosts direct messages between users, but these are end-to-end encrypted so the central operator can't read them.
## Specification
Federnet is defined in a specification which can be found in `docs/Federnet_Specification.pdf`.  The code in this repository is an implementation of this specification.
## Setup
### For users
To use Federnet, you can download and build the Electron app in the user_client directory of this repository.  You will need to provide the address of an infrastructure server and create an account.

You will then be able to choose a community, in which you can read existing posts and submit new ones.  If you like a community, you can pin it to make accessing it easy in future.
### For community operators
This assumes that you already have a server set up, with a domain and SSL certificates ready to go.

Build the `community_server/src` directory with TypeScript

Before starting the server application, you will need the following things:
- Node.JS installed
- The Node packages listed in package-lock.json (just running `npm install` in the root of this repository will install them all)
- A MongoDB server
  - The community server application will need the credentials for an account on the MongoDB server with the following roles on the database:
    - readWrite
    - dbAdmin
- An SSL certificate with an associated private key
- A file called `.env` in the `community_server/` directory, containing the following environment variables:

| Name | Description | Example value | Required |
| --- | --- | --- | --- |
| LOG_PATH | Path (can be relative) to the directory that will hold the log files | `"./community_server/logs/"` | Yes |
| PRIV_KEY_FILE | The path (can be relative) to the private key file.  A new key will be created on first run if the file doesn't exist | `"./community_server/keys/priv_key.pem"` | Yes |
| PRIV_KEY_PASSPHRASE | A password used to encrypt the private key when it is stored, and decrypt it when it is imported.  If the passphrase is changed, the private key must be regenerated (do this by deleting the private key file and restarting the application). | `"foobar"` | Yes |
| SSL_CERT_FILE | The path of an x509 certificate file to be used as the HTTPS certificate for the Community Server API. | `"./community_server/keys/community_ssl_cert.pem"` | Yes |
| SSL_KEY_FILE | The path of the key file for the SSL Cert provided in SSL_CERT_FILE.  Encrypted keys are not supported. | `"./community_server/keys/community_ssl_key.pem"` | Yes |
| PORT | The port on which the API will be served. | `8080` | No (if not provided a default port of 24402 will be used) |
| DB_CONN_STRING | The connection string to connect to the MongoDB server.  This must include the authentication credentials. | `"mongodb://communityuser:password@localhost:27017/?authMechanism=DEFAULT&authSource=Federnet_Community"` | Yes |
| DB_NAME | The name of the MongoDB database to be used by the application. | `"Federnet_Community"` | Yes |
| INFRASTRUCTURE_SERVER_ADDRESS | The address at which the Infrastructure Server can be accessed.  Can include a port. | `"https://infra.example.com:24401"` | Yes |
| COMMUNITY_DATA_FILE | The path (can be relative) to the file that will hold the details of the community hosted by the Community Server.  The file will be created if it doesn’t exist.  This file is a data file for the use of the application and should not be modified by the user. | `"./community_server/data/community_data.dat"` | Yes |

Start the server application by running `node community_server/build/index.js` from repository root.  A CLI will pop up with a prompt for registering the new server.  Once this is done, the server is ready to go.

For the commands which can be run in this CLI once the setup prompt is complete, see `docs/Community_Server_CLI_Commands.pdf`
### For central operators
To set up a new Federnet network, you will need to host an infrastructure server.  These instructions assume you already have the server itself set up and ready to go, and just need to set up the Federnet software.

Build the `infrastructure_server/src` directory with TypeScript.

Before starting the server application, you will need the following things:
- Node.JS installed
- The Node packages listed in package-lock.json (just running `npm install` in the root of this repository will install them all)
- A MongoDB server
  - The infrastructure server application will need the credentials for an account on the MongoDB server with the following roles on the database:
    - readWrite
    - dbAdmin
- An SSL certificate with an associated private key
- A file called `.env` in the `infrastructure_server/` directory, containing the following environment variables:

| Name | Description | Example value | Required |
| --- | --- | --- | --- |
| LOG_PATH | Path (can be relative) to the directory that will hold the log files | `"./infrastructure_server/logs/"` | Yes |
| PRIV_KEY_FILE | The path (can be relative) to the private key file.  A new key will be created on first run if the file doesn't exist | `"./infrastructure_server/keys/priv_key.pem"` | Yes |
| PRIV_KEY_PASSPHRASE | A password used to encrypt the private key when it is stored, and decrypt it when it is imported.  If the passphrase is changed, the private key must be regenerated (do this by deleting the private key file and restarting the application). | `"foobar"` | Yes |
| SSL_CERT_FILE | The path of an x509 certificate file to be used as the HTTPS certificate for the Infrastructure Server API. | `"./infrastructure_server/keys/infrastructure_ssl_cert.pem"` | Yes |
| SSL_KEY_FILE | The path of the key file for the SSL Cert provided in SSL_CERT_FILE.  Encrypted keys are not supported. | `"./infrastructure_server/keys/infrastructure_ssl_key.pem"` | Yes |
| PORT | The port on which the API will be served. | `8080` | No (if not provided a default port of 24401 will be used) |
| DB_CONN_STRING | The connection string to connect to the MongoDB server.  This must include the authentication credentials. | `"mongodb://user:password@localhost:27017/?authMechanism=DEFAULT&authSource=Federnet_Infra"` | Yes |
| DB_NAME | The name of the MongoDB database to be used by the application. | `"Federnet_Infra"` | Yes |
| SESSION_LIFESPAN | The number of seconds that log in tokens should be valid for. | `900` | No (if not provided a default of 900 (15 minutes) will be used) |

Start the server application by running `node infrastructure_server/build/index.js` from repository root.  The application has no user interface.


