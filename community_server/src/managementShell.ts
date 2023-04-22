/*
    Commands for the management CLI
*/

import inquirer from 'inquirer';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

import * as dotenv from 'dotenv';
dotenv.config({ path: './community_server/.env'});

import log from "./log.js";
import * as infrastructureServerService from './service/infrastructureServerService.js';
import { ICommunityInfo } from './model/ICommunityInfo.js';
import { KeypairSingleton } from './KeypairSingleton.js';

let communityInfo: ICommunityInfo;

export async function startCLI() {
    // Run first time community setup
    // Read community info
    let community = await readCommunityFile();
    if (community !== null) {
        // A community has already been set up, so just listen for commands
        communityInfo = community;
        log.info("Community info loaded.  Starting command console");
        handleCommands();
    } else {
        // A community has not been set up, so run the registerCommunity prompt for first time set up
        log.warn("Unable to read community info.  Running first time set up prompt to create a new community");
        await registerCommunity();
        // After setting up the community listen for commands as normal
        await handleCommands();
    }
}

async function readCommunityFile(): Promise<ICommunityInfo | null> {
    // Read the info of the community hosted by this server from the community file
    // Make sure environment variable for the community file location is provided and valid
    if (process.env.COMMUNITY_DATA_FILE !== undefined) {
        try {
            let content = await readFile(process.env.COMMUNITY_DATA_FILE, {
                encoding: "utf8"
            });
            let communityInfo = JSON.parse(content);
            if (
                communityInfo.name !== undefined && typeof communityInfo.name === "string" && 0 < communityInfo.name.length &&
                communityInfo.description !== undefined && typeof communityInfo.description === "string" && 0 < communityInfo.description.length &&
                communityInfo.address !== undefined && typeof communityInfo.address === "string" && new URL(communityInfo.address).toString()
            ) {
                // The data is provided and valid
                return communityInfo;
            } else {
                // Not all the data is provided and valid
                return null;
            }
        } catch (e) {
            return null;
        }
    } else {
        log.fatal("No file path provided in COMMUNITY_DATA_FILE environment variable");
        process.exit(1);
    }
}

async function writeCommunityFile(communityInfo: ICommunityInfo) {
    if (process.env.COMMUNITY_DATA_FILE !== undefined) {
        try {
            log.info("Writing info to community file");
            let json = JSON.stringify(communityInfo);

            // Create data directory if it doesn't already exist
            await mkdir(dirname(process.env.COMMUNITY_DATA_FILE), {
                recursive: true
            });
            // Write to file
            await writeFile(process.env.COMMUNITY_DATA_FILE, json, {
                encoding: "utf8"
            })
        } catch (e) {
            log.fatal(e, "An error occured while writing community data to file");
            process.exit(1);
        }
    } else {
        log.fatal("No file path provided in COMMUNITY_DATA_FILE environment variable");
        process.exit(1);
    }
}

async function registerCommunity() {
    let answers = await inquirer.prompt([
        {
            name: "COMMUNITY_NAME",
            type: "input",
            message: "Enter the name of the new community"
        },
        {
            name: "COMMUNITY_DESCRIPTION",
            type: "input",
            message: "Enter the community description"
        },
        {
            name: "COMMUNITY_ADDRESS",
            type: "input",
            message: "Enter the address at which the community can be accessed"
        }
    ]);

    let name = answers.COMMUNITY_NAME;
    let description = answers.COMMUNITY_DESCRIPTION;
    let address = answers.COMMUNITY_ADDRESS;

    // Attempt to register new community
    let result: string = await infrastructureServerService.registerCommunity(name, description, address);
    // If registration is unsuccessful due to one of the values provided, ask for a different value and try again until a suitable value is given
    while (result !== "Success" && result !== "GenericFailure") {
        if (result === "CommunityNameNotUnique") {
            let answer = await inquirer.prompt([
                {
                    name: "COMMUNITY_NAME",
                    type: "input",
                    message: "The given community name is already taken.  Enter the name of the new community"
                }
            ]);
            name = answer.COMMUNITY_NAME;
        } else if (result === "UnsuitableAddress") {
            let answer = await inquirer.prompt([
                {
                    name: "COMMUNITY_ADDRESS",
                    type: "input",
                    message: "The Infrastructure Server did not find a Community Server at the given address.  Enter the address at which the community can be accessed"
                }
            ]);
            address = answer.COMMUNITY_ADDRESS;
        }

        // Try registration again
        result = await infrastructureServerService.registerCommunity(name, description, address);
    }

    if (result === "Success") {
        console.log("Registered new community");
        log.info("Registered new community");
        // Write community to file
        communityInfo = {name, description, address};
        await writeCommunityFile(communityInfo);
    } else {
        console.log("Failed to register community.  Something went wrong");
        log.fatal("Failed to register community. Something went wrong");
        process.exit(1);
    }
}

export async function handleCommands() {

    // Define callback for handling commands
    let commandHandler = async (data: Buffer) => {
        let text = data.toString("utf8").trim();
        // Split on first whitespace
        let whitespaceIdx = text.indexOf(" ");
        let args;
        if (whitespaceIdx !== -1) {
            args = [text.substring(0, whitespaceIdx), text.substring(whitespaceIdx + 1)];
        } else {
            args = [text];
        }

        switch (args[0]) {
            case "showcommunity":
                showCommunity();
                break;
            case "updatename":
                await updateName(args[1]);
                break;
            case "updatedescription":
                await updateDescription(args[1]); 
                break;
            case "updateaddress":
                await updateAddress(args[1]);
                break;
            case "deletecommunity":
                // Must remove this listener first, as otherwise it interferes with the inquirer prompts in deleteCommunity, causing the question to be repeated every time the user presses a key
                process.stdin.removeListener("data", commandHandler);
                await deleteCommunity();
                // Add the listener again
                process.stdin.resume();
                process.stdin.on("data", commandHandler);
                break;
            case "regeneratekeys":
                await regenerateKeys();
                break;
            case "exit":
                exitCommand();
                break;
            default:
                console.log("Unrecognised command");
        }

        // Prompt for next command
        process.stdout.write(">>> ");
    };

    // Start listening for input on stdin
    process.stdin.resume();
    process.stdin.on("data", commandHandler);

    console.log("CLI ready");
    process.stdout.write(">>> ");  // Use triple > to indicate interactive command session
}

function showCommunity() {
    // Output community info
    console.log(`Community name: ${communityInfo.name}`);
    console.log(`Community description: ${communityInfo.description}`);
    console.log(`Community address: ${communityInfo.address}`);
}

async function updateName(newName: string | undefined) {
    if (newName !== undefined) {
        // Send request to update name
        let response = await infrastructureServerService.updateCommunity(communityInfo.name, {
            name: newName,
        });

        switch (response) {
            case "Success":
                // Write updated data to file
                communityInfo.name = newName;
                await writeCommunityFile(communityInfo);
                console.log("Name updated");
                break;
            case "CommunityNameNotUnique":
                console.log("Failed to update name.  The name is already taken");
                break;
            default:
                console.log("An issue occurred while updating name.  A serious issue with the stored community information is likely (it is unlikely that post data is affected by this).  Check logs for more info");
        }
    } else {
        console.log("Missing argument `name`.  Correct syntax: updatename <new name>");
    }
}

async function updateDescription(newDescription: string | undefined) {
    if (newDescription !== undefined) {
        // Send request to update description
        let response = await infrastructureServerService.updateCommunity(communityInfo.name, {
            description: newDescription,
        });

        switch (response) {
            case "Success":
                // Save updated data to file
                communityInfo.description = newDescription;
                await writeCommunityFile(communityInfo);
                console.log("Description updated");
                break;
            default:
                console.log("An issue occurred while updating description.  A serious issue with the stored community information is likely (it is unlikely that post data is affected by this).  Check logs for more info");
        }
    } else {
        console.log("Missing argument `description`.  Correct syntax: updatedescription <new description>");
    }
}

async function updateAddress(newAddress: string | undefined) {
    if (newAddress !== undefined) {
        // Send request to update address
        let response = await infrastructureServerService.updateCommunity(communityInfo.name, {
            address: newAddress,
        });

        switch (response) {
            case "Success":
                // Save updated data to file
                communityInfo.address = newAddress;
                await writeCommunityFile(communityInfo);
                console.log("Address updated");
                break;
            case "UnsuitableAddress":
                console.log("Failed to update address.  The Infrastructure Server did not find a Community Server at the given address");
                break;
            default:
                console.log("An issue occurred while updating address.  A serious issue with the stored community information is likely (although it is unlikely that post data is affected by this).  Check logs for more info");
        }
    } else {
        console.log("Missing argument `address`.  Correct syntax: updateaddress <new address>");
    }
}

async function deleteCommunity() {
    // Remove the community registration from the Infrastructure Server and delete the local community data file.
    
    // Ask the user to confirm first
    let confirmation = await inquirer.prompt([
        {
            name: "CONFIRM",
            type: "input",
            message: "Warning: The community will be removed from the Infrastructure Server.  This is a permanent action.  Enter the community name to confirm that you wish to continue",
        }
    ]);
    if (confirmation.CONFIRM.trim() === communityInfo.name) {
        switch (await infrastructureServerService.removeCommunity(communityInfo.name)) {
            case "Success":
                // Successfully removed the community from the infrastructure server.  Wipe the community data file and shut down peacefully
                writeCommunityFile({name: "", description: "", address: ""});  // Write with empty data
                console.log(`The community ${communityInfo.name} has been deleted.  Note: The post data has been left intact`);
                log.info(`The community ${communityInfo.name} has been deleted.  Shutting down server`);
                process.exit(0);
            default:
                console.log(`An issue occured while removing community ${communityInfo.name}.  A serious issue with the stored community information is likely (although it is unlikely that post data is affected by this).  Check logs for more info`);
        }
    } else {
        console.log("Cancelling operation");
    }
}

async function regenerateKeys() {
    // Regenerate the keypair
    try {
        let keypair = await KeypairSingleton.getInstance();
        // First make a copy of the old private key file in case something goes wrong and it is lost before the new one is set
        if (await keypair.backupPrivateKey()) {
            // Regenerate the keys
            let {publicKey, privateKey} = await keypair.generateNewKeys();
            // Update the public key on the Infrastructure Server

            if (await infrastructureServerService.updateCommunity(communityInfo.name, {
                publicKey: publicKey
            }) === "Success") {
                // Save the new keys
                await keypair.updateKeys(publicKey, privateKey);
                console.log("New keys generated and Infrastructure Server updated");
            } else {
                console.log("Something went wrong while updating the keys.  This is a serious problem, likely indicating an issue with the stored communinity data (though post data is unlikely to be affected).  Check logs for more info");
            }
        } else {
            console.log("Failed to backup private key file.  See log for more info.  Cancelling operation.");
        }

    } catch (e) {
        console.log("Something went wrong while regenerating keypair");
        log.error(e, "Something went wrong while regenerating keypair");
    } 
}

function exitCommand() {
    // Shut down peacefully
    console.log("Shutting down");
    log.info("Shutting down due to `exit` command");
    process.exit(0);
}

