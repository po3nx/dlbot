import { Telegraf, Context, Middleware } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { IConfigService } from "../config/config.interface";
import { Command } from "./command.class";
import { OpenaiService } from "../ai/openai.service";
import https from "https";
import { ChatCompletionMessageParam } from "openai/resources";

export class ChatCommand extends Command {
    private botChats: { [key: string]: BotChat };

    constructor(bot: Telegraf<IBotContext>, private readonly configService: IConfigService) {
        super(bot);
        this.botChats = {};
    }

    handle(): void {
        const aiService = new OpenaiService(this.configService);

        this.bot.on('text', (ctx) => this.handleText(ctx, aiService));
        this.bot.on('photo', (ctx) => this.handlePhoto(ctx, aiService));
    }

    private async handleText(ctx:any, aiService: OpenaiService): Promise<void> {
        const replyText = this.extractReplyText(ctx);
        const formattedDate = this.formatCurrentDate();
        const chatId = ctx.chat!.id.toString();
        const username = ctx.from!.username as string;
        const text = `'${replyText}'\n${ctx.message!.text}`;

        let botChat = this.botChats[chatId] || this.initializeBotChat(chatId, username, formattedDate);
        botChat.messages.push({ 'role': "user", 'content': text });
        this.trimMessages(botChat);

        if (this.shouldGenerateImage(text)) {
            const imageUrl = await aiService.generateImage(text);
            if (imageUrl) {
                ctx.replyWithPhoto(imageUrl);
            }
        } else {
            const response = await aiService.chatCompletion(this.prepareMessages(botChat));
            if (response) {
                botChat.messages.push({ 'role': "assistant", 'content': response });
                this.trimMessages(botChat);
                ctx.reply(response);
            }
        }
    }

    private async handlePhoto(ctx:any, aiService: OpenaiService): Promise<void> {
        const text = ctx.message!.caption || "Jelaskan Gambar berikut";
        const imageId = ctx.message!.photo!.pop()?.file_id;

        if (imageId) {
            const imageUrl = await ctx.telegram.getFileLink(imageId);
            this.processImageResponse(imageUrl, text, aiService, ctx);
        }
    }

    private extractReplyText(ctx:any): string {
        if (ctx.message?.reply_to_message) {
            if ('text' in ctx.message.reply_to_message) {
                return ctx.message.reply_to_message.text!;
            } else if ('caption' in ctx.message.reply_to_message) {
                return ctx.message.reply_to_message.caption!;
            }
        }
        return "";
    }

    private formatCurrentDate(): string {
        return new Date().toLocaleDateString('id', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    private initializeBotChat(chatId: string, username: string, date: string): BotChat {
        const botChat: BotChat = {
            id: chatId,
            user: username,
            date: date,
            messages: []
        };
        this.botChats[chatId] = botChat;
        return botChat;
    }

    private trimMessages(botChat: BotChat): void {
        if (botChat.messages.length > 9) {
            botChat.messages.shift();
        }
    }

    private shouldGenerateImage(text: string): boolean {
        return /(txt2img|(make|create|buat|cari|generate|bikin).*\b(gambar|foto|desain|design|image|photo|lukisan|ilustrasi|paint|illustration))/i.test(text);
    }

    private prepareMessages(botChat: BotChat): ChatCompletionMessageParam[] {
        const initialMessages: ChatCompletionMessageParam[] = [{
            "role": "system",
            "content": "Nama anda MasPung Bot, bot Telegram cerdas buatan Purwanto yang terintegrasi dengan ChatGPT buatan OpenAI. Jawablah pertanyaan dengan sesingkat mungkin."
        }];
        return [...initialMessages, ...botChat.messages];
    }

    private async processImageResponse(imageUrl: URL, text: string, aiService: OpenaiService, ctx: IBotContext): Promise<void> {
        https.get(imageUrl, (response) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            }).on('end', async () => {
                const imageBuffer = Buffer.concat(chunks);
                const base64Image = imageBuffer.toString('base64');
                const reply = await aiService.visionAI(base64Image, text);
                if (reply) {
                    ctx.reply(reply);
                }
            });
        }).on('error', (error) => {
            console.error("Failed to download or convert image:", error);
        });
    }
}

export interface BotChat {
    id: string;
    user: string;
    date: string;
    messages: ChatCompletionMessageParam[];
}