import { IConfigService } from "../config/config.interface";
import { IOpenaiService } from "./openai.interface";
import { Configuration,OpenAIApi ,ChatCompletionRequestMessage} from "openai";
import axios from "axios"
export class OpenaiService implements IOpenaiService {
    private apiKey: string;
    private configuration:Configuration
    
    constructor(private readonly configService: IConfigService) {
        this.apiKey = this.configService.get("OPENAI_API_KEY");
        this.configuration = new Configuration({
            apiKey: this.apiKey,
        });
    }
    async chatCompletion(text: string): Promise<string | null> {
        const openai = new OpenAIApi(this.configuration);
        const messg:ChatCompletionRequestMessage[] = [{"role":"system","content":"Nama anda MasPung Bot, bot Telegram cerdas buatan Purwanto yang terintegrasi dengan ChatGPT buatan OpenAI. Jawablah pertanyaan dengan sesingkat mungkin."},
            {"role":"user","content":text}
        ]
              
        const respo = await openai.createChatCompletion({
            model: 'gpt-4-turbo',
            temperature: 0.6,
            max_tokens: 2000,
            //top_p: 1.0,
            //frequency_penalty: 0.1,
            //presence_penalty: 0.0,
            messages: messg
          });
          if (respo.data && respo.data.choices && respo.data.choices.length > 0) {
            const firstChoice = respo.data.choices[0];
            if (firstChoice.message && firstChoice.message.content) {
                const respai = firstChoice.message.content;
                return respai;
            }
        }
        console.error("Response structure is not as expected or missing data.");
        return null; 
    }
    async visionAI(imageBase64: string, text: string): Promise<string | null > {
        const message:ChatCompletionRequestMessage[] = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text},
                    {"type": "image_url", "image_url": {"url": "data:image/png;base64,"+imageBase64}}
                ] as unknown as string
              }]
        const openai = new OpenAIApi(this.configuration);
        const respo = await openai.createChatCompletion({
            model: 'gpt-4-turbo',
            temperature: 0.6,
            max_tokens: 2000,
            messages: message
        });
        if (respo.data && respo.data.choices && respo.data.choices.length > 0) {
            const firstChoice = respo.data.choices[0];
            if (firstChoice.message && firstChoice.message.content) {
                const respai = firstChoice.message.content;
                return respai;
            }
        }
        console.error("Response structure is not as expected or missing data.");
        return null; 
    }
    async  generateImage(text: string): Promise<string | null> {
        const openai = new OpenAIApi(this.configuration);
        const response:any = await openai.createImage({
            prompt: text.toString().trim(),
            n: 1,
            size: "1024x1024",
        });
        const image_url = response.data.data[0].url;
        return image_url || null
    }
}