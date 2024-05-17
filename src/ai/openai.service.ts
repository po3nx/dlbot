import { ChatCompletionMessageParam, ChatCompletionMessage } from "openai/resources";
import { IConfigService } from "../config/config.interface";
import { ChatMessage, IOpenaiService } from "./openai.interface";
import { OpenAI } from "openai";

export class OpenaiService implements IOpenaiService {
    private openai: OpenAI;
    constructor(private readonly configService: IConfigService) {
        this.openai = new OpenAI();
    }
    async chatCompletion(messages: ChatCompletionMessageParam[]): Promise<string | null> {
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo',
                temperature: 0.6,
                max_tokens: 2000,
                messages: messages
            });

            if (response.choices?.[0]?.message?.content) {
                return response.choices[0].message.content;
            }
        } catch (error) {
            console.error("Failed to get chat completion:", error);
        }
        console.error("Response structure is not as expected or missing data.");
        return null;
    }
    async visionAI(imageBase64: string, text: string): Promise<string | null> {
        try {
            const message: ChatCompletionMessageParam[] = [{
                role: "user",
                content: [
                    { type: "text", text: text },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
                ]
            }];

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4-turbo',
                temperature: 0.6,
                max_tokens: 2000,
                messages: message
            });

            if (response.choices?.[0]?.message?.content) {
                return response.choices[0].message.content;
            }
        } catch (error) {
            console.error("Failed to get vision AI response:", error);
        }
        console.error("Response structure is not as expected or missing data.");
        return null;
    }
    async generateImage(text: string): Promise<string | null> {
        try {
            const response = await this.openai.images.generate({
                prompt: text.trim(),
                model: "dall-e-3",
                n: 1,
                size: "1024x1024",
            });

            if (response.data?.[0]?.url) {
                return response.data[0].url;
            }
        } catch (error) {
            console.error("Failed to generate image:", error);
        }
        return null;
    }
}