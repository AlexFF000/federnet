/*
    Represents a set of tests to be run
*/
export default class {
    constructor(...tests) {
        this.tests = tests;
        // Functions to be run before running the testset
        this.beforeAll = [];
        // Functions to be run before each test
        this.beforeEach = [];
        // Functions to be run after running the testset
        this.afterAll = [];
        // Functions to be run after running each test
        this.afterEach = [];
        // Data shared between functions and usable in the tests
        this.sharedData = {};
    }

    runBeforeAll(...functions) {
        this.beforeAll = functions;
    }

    runBeforeEach(...functions) {
        this.beforeEach = functions;
    }

    runAfterAll(...functions) {
        this.afterAll = functions;
    }

    runAfterEach(...functions) {
        this.afterEach = functions;
    }
}