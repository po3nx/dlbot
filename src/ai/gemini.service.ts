import vm from "vm";
import https from "https";
import { load } from "cheerio";
import axios, { AxiosInstance } from "axios";
import { AxiosConfig, GoogleData, APIResponse, IGeminiService } from "./gemini.interface";
import { IConfigService } from "../config/config.interface";

export class GeminiService implements IGeminiService {
    private axios: AxiosInstance;
    private cookies: string;
    private snlm0e?: string;
    private cfb2h?: string;
    public c?:string;
    public r?:string;
    public rc?:string;

    constructor(private readonly configService: IConfigService) {
        this.cookies = `__Secure-1PSIDTS=${this.configService.get("__Secure_1PSIDTS")};__Secure-1PSIDCC=${this.configService.get("__Secure_1PSIDCC")};__Secure-1PSID=${this.configService.get("__Secure_1PSID")};__Secure-1PAPISID=${this.configService.get("__Secure_1PAPISID")};`
        const agent = new https.Agent({
            rejectUnauthorized: false,
        });

        const axiosOptions: AxiosConfig = {
            httpsAgent: agent,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate, br",
                Connection: "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-User": "?1",
                TE: "trailers",
            },
        };

        this.axios = axios.create(axiosOptions);
    }
    private parseResponse(response: string): BardAnswer | { error:boolean, content: string } {
        const answ = response.split("\n");
        const googleMapLinks: string[] = [];
    
        if (answ.length > 3) {
            let resp_dict: any;
            if (answ[3].includes('google_map_tool') || answ[3].includes('hotels_tool')) {
                resp_dict = JSON.parse(answ[11])[0][2];
                this.extractMapLink(JSON.parse(resp_dict), googleMapLinks);
            } else {
                resp_dict = JSON.parse(answ[3])[0][2];
            }
    
            if (resp_dict === null) {
                return { error:true, content: `Response Error: ${response}.` };
            }
            const parsed_answer = JSON.parse(resp_dict);
            this.c = parsed_answer[1][0];
            this.r = parsed_answer[1][1];
            this.rc = parsed_answer[4][0][0];
    
            const bard_answer: BardAnswer = {
                conversation_id: parsed_answer[1][0],
                response_id: parsed_answer[1][1],
                choice_id: parsed_answer[4][0][0],
                factualityQueries: parsed_answer[3],
                textQuery: parsed_answer[2][0] ?? "",
                choices: parsed_answer[4].map((i: any) => ({
                    id: i[0],
                    content: i[1]
                })),
                link: []
            };
    
            const pattern = /\[(https?:\/\/[^\]]+)\]/g;
            const matches = bard_answer.choices[0].content[0].match(pattern) || [];
            const filteredLinks = matches.filter((link: string) => !link.includes('googleusercontent.com'));
    
            bard_answer.link.push(...googleMapLinks);
    
            if (googleMapLinks.length > 0) {
                bard_answer.choices[0].content += "\nLocation Link:\n";
                bard_answer.maplink = true;
                googleMapLinks.forEach(link => {
                    bard_answer.choices[0].content += `${link}\n`;
                });
            }
    
            bard_answer.link.push(...filteredLinks);
    
            if (filteredLinks.length > 0) {
                bard_answer.choices[0].content += "\nRelated Link:\n";
                bard_answer.otherlink = true;
                filteredLinks.forEach(link => {
                    bard_answer.choices[0].content += `${link}\n`;
                    bard_answer.link.push(`${link}\n`);
                });
            }
    
            return bard_answer;
        } else {
            return {error :true , content:"Error on parsing response" };
        }
    }
    
    private extractMapLink(data: any, result: string[]): void {
        if (Array.isArray(data)) {
            data.forEach(value => {
                if (Array.isArray(value)) {
                    this.extractMapLink(value, result);
                } else if (typeof value === 'string' && value.startsWith("https://maps.google.com")) {
                    if (!result.includes(value)) {
                        result.push(value);
                    }
                }
            });
        }
    }
    private ParseResponse(text: string): string[] {
        let responses: string[] = [];

        const parseData = (data: any) => {
            if (typeof data === "string") {
                if (data.startsWith("c_") || data.startsWith("r_") || data.startsWith("rc_")) {
                    if (data.startsWith("c_")) {
                        if (!this.c) {
                            this.c = data;
                        }
                    } else if (data.startsWith("r_")) {
                        if (!this.r) {
                            this.r = data;
                        }
                    } else if (data.startsWith("rc_")) {
                        if (!this.rc) {
                            this.rc = data;
                        }
                    }
                    return;
                }
                responses.push(data);
            } else if (Array.isArray(data)) {
                data.forEach((item) => {
                    parseData(item);
                });
            }else if (typeof data === "object" && data !== null) {
                Object.values(data).forEach((value) => {
                    parseData(value);
                });
            }
        };

        try {
            const lines = text.split("\n");
            for (const line of lines) {
                if (line.includes("wrb.fr")) {
                    const data = JSON.parse(line);
                    const responsesData = JSON.parse(data[0][2]);
                    responsesData.forEach((response: any) => {
                        parseData(response);
                    });
                }
            }
        } catch (e) {
            throw new Error(
                `Error parsing response: make sure you are using the correct cookie, copy the value of "__Secure-1PSID" and "__Secure-1PSIDTS" cookie and set it like this: \n\nnew Bard("__Secure-1PSID=<COOKIE_VALUE>;__Secure-1PSIDTS=<COOKIE_VALUE>")\n\nAlso using a US proxy is recommended.\n\nIf this error persists, please open an issue on github.\nhttps://github.com/kuumoneko/GoogleBard-js`
            );
        }

        return responses;
    }

    async getAPI(): Promise<APIResponse> {
        try {
            const response = await this.axios.get("https://gemini.google.com", {
                headers: {
                    Cookie: this.cookies,
                },
            });

            const $ = load(response.data);
            let script = $("script[data-id=_gd]").html();
            if (!script) {
                throw new Error('Script with data-id "_gd" not found');
            }
            script = script.replace("window.WIZ_global_data", "googleData");
            const context = { googleData: { cfb2h: "", SNlM0e: "" } as GoogleData };
            vm.createContext(context);
            vm.runInContext(script, context);
            const at = context.googleData.SNlM0e;
            const bl = context.googleData.cfb2h;
            this.snlm0e = at;
            this.cfb2h = bl;
            if (at !== undefined && bl !== undefined) {
                return { at, bl };
            } else {
                throw new Error(
                    `Error parsing response: make sure you are using the correct cookie, copy the value of "__Secure-1PSID" and "__Secure-1PSIDTS" cookie and set it like this: \n\nnew Bard("__Secure-1PSID=<COOKIE_VALUE>;__Secure-1PSIDTS=<COOKIE_VALUE>")\n\nAlso using a US proxy is recommended.\n\nIf this error persists, please open an issue on github.\nhttps://github.com/kuumoneko/GoogleBard-js`
                );
            }
        } catch (e) {
            throw new Error(
                `Error parsing response: make sure you are using the correct cookie, copy the value of "__Secure-1PSID" and "__Secure-1PSIDTS" cookie and set it like this: \n\nnew Bard("__Secure-1PSID=<COOKIE_VALUE>;__Secure-1PSIDTS=<COOKIE_VALUE>")\n\nAlso using a US proxy is recommended.\n\nIf this error persists, please open an issue on github.\nhttps://github.com/kuumoneko/GoogleBard-js`
            );
        }
    }
    private cleanRequestPayload(payload: string): string {
        let cleanedPayload = payload.trim();
        const regex = /^['"]|['"]$|^''|''$/g;
        cleanedPayload = cleanedPayload.replace(regex, '');
        cleanedPayload = cleanedPayload.replace(/^\n*/, '').trim();
    
        return cleanedPayload;
    }
    async ask(prompt: string): Promise<string> {
        const resData = await this.send(this.cleanRequestPayload(prompt));
        //console.log(JSON.stringify(resData))
        if (resData.error){
            return resData.content
        } else{
            return resData.choices[0].content;
        }
    }

    async askStream(data: (chunk: string) => void, prompt: string): Promise<string> {
        const resData = await this.send(this.cleanRequestPayload(prompt));
        if (!resData || !resData[3]) return "";

        const responseChunks = resData[3].split(" ");
        for (const chunk of responseChunks) {
            if (chunk === "") continue;
            data(`${chunk} `);
            await this.sleep(this.random(25, 250));
        }
        return resData[3];
    }

    async send(prompt: string): Promise<BardAnswer | any> {
        try {
            const req = [null, JSON.stringify([[prompt], ["en"], [this.c, this.r, this.rc]])];
            const moi = JSON.stringify(req);
            const response = await this.axios.post(
                "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate",
                new URLSearchParams({
                    at: this.snlm0e!,
                    "f.req": moi,
                }),
                {
                    headers: {
                        Cookie: this.cookies,
                    },
                    params: {
                        bl: this.cfb2h!,
                        rt: "c",
                        _reqid: "0",
                    },
                }
            );
            //console.log(response.data)
            return this.parseResponse(response.data);
        } catch (e:any) {
            console.log(e.message);
            throw new Error(`Error sending request: ${e.message}`);
        }
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private random(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}
interface BardAnswer {
    conversation_id: string;
    response_id: string;
    choice_id: string;
    factualityQueries: any[];
    textQuery: string;
    choices: { id: string; content: string }[];
    link: string[];
    maplink?: boolean;
    otherlink?: boolean;
}