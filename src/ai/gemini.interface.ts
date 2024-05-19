import { AxiosRequestConfig } from "axios";

// Interface for Axios Configuration
export interface AxiosConfig extends AxiosRequestConfig {
    httpsAgent: any;
    headers: {
        "User-Agent": string;
        Accept: string;
        "Accept-Language": string;
        "Accept-Encoding": string;
        Connection: string;
        "Upgrade-Insecure-Requests": string;
        "Sec-Fetch-Dest": string;
        "Sec-Fetch-Mode": string;
        "Sec-Fetch-Site": string;
        "Sec-Fetch-User": string;
        TE: string;
    };
}

// Interface for Google Data
export interface GoogleData {
    cfb2h: string;
    SNlM0e: string;
}

// Interface for API response
export interface APIResponse {
    at: string;
    bl: string;
}

// ChatBot Class Interface
export interface IGeminiService {
    ask(prompt: string): Promise<any>;
    //askStream(data: (chunk: string) => void, prompt: string): Promise<any>;
    send(prompt: string): Promise<string[]>;
    getAPI(): Promise<APIResponse>;
}
