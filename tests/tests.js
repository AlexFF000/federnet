/*
    Main file for running the test suite

    Test naming convention:
    test_<Category>_<Action>_<Case under test>
    e.g. test_Account_CreateAccount_UsernameNotUnique

    If successful, tests should return true.  Else return a string saying why it failed
*/
import {tests_Account, tests_Account_CreateAccount} from './accountTests.js';
import { tests_Community, tests_Community_InfrastructureServer } from './CommunityTests.js';
import { tests_DirectMessage } from './DirectMessageTests.js';
import { tests_Post } from './PostTests.js';
import TestSet from './Structures/TestSet.js';


async function runTests(params) {
    /* Params passed as a dict in format:
        {
            tests: <list of testsets to be run>,
            servers: {
                infrastructureServer: <Address of infrastructure server (only needed for infrastructure server tests)>,
                communityServer: <Address of community server (only needed for community server tests)>
            }
        }
    */
    let testsets = params.tests;
    let servers = params.servers;

    let passed = 0;
    let failed = 0;
    
    if (testsets instanceof TestSet) testsets = [testsets];  // If only one testset is provided then contain it in an array as the following loop expects an array

    for (let set of testsets) {
        let testsToRun = set.tests;
        // Run beforeAll functions
        let beforeAllFailed = false;
        for (let func of set.beforeAll) {
            if (await func(servers, set.sharedData) === "TERMINATE") {
                beforeAllFailed = true;
                break;
            }
        }
        if (beforeAllFailed) {
            // If any of the beforeAll functions failed, then fail the entire testset without running the tests
            console.log("BeforeAll function failed.  The testset will not be run");
            failed += testsToRun.length;
            continue;
        }
        for (let test of testsToRun) {
            // Run beforeEach functions
            for (let func of set.beforeEach) await func(servers, set.sharedData);
            // Run actual test
            let result = await test(servers, set.sharedData);
            if (result === true) {
                passed++;
                console.log(`${test.name}: PASS`);
            } else {
                failed++;
                console.log(`${test.name}: FAIL.  ${result}`);
            }
            // Run afterEach functions
            for (let func of set.afterEach) await func(servers, set.sharedData);
        }
        // Run afterAll functions
        for (let func of set.afterAll) await func(servers, set.sharedData);
    }
    console.log(`${passed} passed.  ${failed} failed`);
}

function getInfoFromCmdArgs(args) {
    // Command to run tests should be as follows node tests.js <name of test set> <infrastructure server address> <community server address>
    let info = {
        tests: [],
        servers: {}
    }
    if (args[2] !== undefined) {
        let tests = [];
        switch (args[2].toLowerCase()) {
            case "tests_account":
                tests = tests.concat(tests_Account);
                break;
            case "tests_account_createaccount":
                tests.push(tests_Account_CreateAccount);
                break;
            case "tests_community":
                tests = tests.concat(tests_Community);
                break;
            case "tests_community_infrastructureserver":
                tests = tests.concat(tests_Community_InfrastructureServer);
                break;
            case "tests_directmessage":
                tests = tests.concat(tests_DirectMessage);
                break;
            case "tests_post":
                tests = tests.concat(tests_Post);
                break;
            case "all":
                tests = tests.concat(tests_Account, tests_Community, tests_DirectMessage, tests_Post);
                break;
        }
        info.tests = tests;

        info.servers.infrastructureServer = args[3];
        info.servers.communityServer = args[4];

    } else {
        // No tests were specified to be run
        console.log("No tests were specified");
    }
    return info;
}

let params = getInfoFromCmdArgs(process.argv);
runTests(params);
