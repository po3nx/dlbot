import { ChatCompletionMessageParam, ChatCompletionMessage } from "openai/resources";
import { IConfigService } from "../config/config.interface";
import { ChatMessage, IOpenaiService } from "./openai.interface";
import { OpenAI } from "openai";

export class OpenaiService implements IOpenaiService {
    
    constructor(private readonly configService: IConfigService) {
    }
    async chatCompletion(text: string): Promise<string | null> {
        const openai = new OpenAI
        const messg:ChatCompletionMessageParam[] = [{"role":"system","content":"Nama anda MasPung Bot, bot Telegram cerdas buatan Purwanto yang terintegrasi dengan ChatGPT buatan OpenAI. Jawablah pertanyaan dengan sesingkat mungkin."},
            {"role":"user","content":text}
        ]
              
        const respo = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            temperature: 0.6,
            max_tokens: 2000,
            //top_p: 1.0,
            //frequency_penalty: 0.1,
            //presence_penalty: 0.0,
            messages: messg
          });
          if (respo && respo.choices && respo.choices.length > 0) {
            const firstChoice = respo.choices[0];
            if (firstChoice.message && firstChoice.message.content) {
                const respai = firstChoice.message.content;
                return respai;
            }
        }
        console.error("Response structure is not as expected or missing data.");
        return null; 
    }
    async visionAI(imageBase64: string, text: string): Promise<string | null > {
        const message:ChatCompletionMessageParam[] = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text},
                    {"type": "image_url", "image_url": {"url": "data:image/png;base64,"+imageBase64}}
                ]
              }]
        const openai = new OpenAI();
        const respo = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            temperature: 0.6,
            max_tokens: 2000,
            messages: message
        });
        if (respo && respo.choices && respo.choices.length > 0) {
            const firstChoice = respo.choices[0];
            if (firstChoice.message && firstChoice.message.content) {
                const respai = firstChoice.message.content;
                return respai;
            }
        }
        console.error("Response structure is not as expected or missing data.");
        return null; 
    }
    async  generateImage(text: string): Promise<string | null> {
        const openai = new OpenAI();
        const response:any = await openai.images.generate({
            prompt: text.toString().trim(),
            model:"dall-e-3",
            n: 1,
            size: "1024x1024",
        });
        const image_url = response.data[0].url;
        return image_url || null
    }
}