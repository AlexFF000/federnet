/*
    Response body format
*/
export default class {
    code: number;
    message: string;
    data: Array<any> = [];

    constructor(code: number, message: string, data?: Array<any>) {
        this.code = code;
        this.message = message;
        if (data !== undefined) this.data = data;
    }
}