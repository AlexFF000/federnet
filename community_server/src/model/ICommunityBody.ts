/* 
    Community interface for the updateCommunity request.  All fields optional as any combination of the fields can be provided for updateCommunity
*/
export interface ICommunityBody {
    name?: string;
    description?: string;
    address?: string;
    publicKey?: string;
    
    timestamp?: number;
    signature?: string;
}