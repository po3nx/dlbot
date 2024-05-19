import { Telegraf } from "telegraf";
import { message } from 'telegraf/filters';
import { IBotContext } from "../context/context.interface";
import { IConfigService } from "../config/config.interface";
import { Command } from "./command.class";
import { OpenaiService } from "../ai/openai.service";
import axios from "axios";
import { ChatCompletionMessageParam } from "openai/resources";
import { GeminiService } from "../ai/gemini.service";

export class ChatCommand extends Command {
  private botChats: { [key: string]: BotChat } = {};
  private gmnChats: { [key: string]: GeminiChat } = {};

  constructor(bot: Telegraf<IBotContext>, private readonly configService: IConfigService) {
    super(bot);
  }

  public handle(): void {
    const aiService = new OpenaiService(this.configService);
    const gemini = new GeminiService(this.configService)

    this.bot.on(message('text'), ctx => this.handleText(ctx, aiService, gemini));
    this.bot.on(message('photo'), ctx => this.handlePhoto(ctx, aiService));
  }

  private async handleText(ctx: any, aiService: OpenaiService, gemini:GeminiService): Promise<void> {
    const replyText = this.extractReplyText(ctx);
    const formattedDate = this.formatCurrentDate();
    const chatId = ctx.chat.id.toString();
    const username = ctx.from.username as string;
    const text = `'${replyText}'\n${ctx.message.text}`;

    let botChat = this.botChats[chatId] ?? this.initializeBotChat(chatId, username, formattedDate);
    let gmnChat = this.gmnChats[chatId] ?? this.initializeGeminiChat(chatId, formattedDate);
    botChat.messages.push({ role: "user", content: text });
    this.trimMessages(botChat);
   
      
    if (this.shouldGenerateImage(text)) {
      const loadingMsg = await ctx.reply('⚠️ Gambar sedang diproses, Mohon ditunggu 🌐');
      const imageUrl = await aiService.generateImage(text);
      if (imageUrl) {
        botChat.messages.push({ role: "assistant", content: "Gambar telah dibuat, sesuai deskripsi anda" });
        this.trimMessages(botChat);
        ctx.replyWithPhoto(imageUrl);
        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      }
    } else  if (this.shouldUseOpenAI(text)) {
      const response = await aiService.chatCompletion(this.prepareMessages(botChat));
      if (response) {
        botChat.messages.push({ role: "assistant", content: response });
        this.trimMessages(botChat);
        ctx.reply(response);
      }
    } else {
      await gemini.getAPI();
      gemini.c = gmnChat.c
      gemini.r = gmnChat.r
      gemini.rc = gmnChat.rc
      const response = await gemini.ask(text)
      gmnChat.c = gemini.c
      gmnChat.r = gemini.r
      gmnChat.rc = gemini.rc
      ctx.reply(response)
    }
  }

  private async handlePhoto(ctx: any, aiService: OpenaiService): Promise<void> {
    const text = ctx.message.caption || "Jelaskan Gambar berikut";
    const formattedDate = this.formatCurrentDate();
    const chatId = ctx.chat.id.toString();
    const username = ctx.from.username as string;
    const imageId = ctx.message.photo.pop()?.file_id;
    let botChat = this.botChats[chatId] ?? this.initializeBotChat(chatId, username, formattedDate);
    botChat.messages.push({ role: "user", content: text });

    if (imageId) {
      const loadingMsg = await ctx.reply('⚠️ Gambar sedang diproses, Mohon ditunggu 🌐');
      const imageUrl = await ctx.telegram.getFileLink(imageId);
      const response = await this.processImageResponse(imageUrl, text, aiService);
      if (response) {
        botChat.messages.push({ role: "assistant", content: response });
        this.trimMessages(botChat);
        ctx.reply(response);
        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      }
    }
  }

  private extractReplyText(ctx: any): string {
    return ctx.message?.reply_to_message?.text || ctx.message?.reply_to_message?.caption || "";
  }

  private formatCurrentDate(): string {
    return new Date().toLocaleDateString('id', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  private initializeBotChat(chatId: string, username: string, date: string): BotChat {
    const botChat: BotChat = { id: chatId, user: username, date, messages: [] };
    this.botChats[chatId] = botChat;
    return botChat;
  }
  private initializeGeminiChat(chatId: string,  date: string): GeminiChat {
    const gmnChat: GeminiChat = { id: chatId, r:"", c:"",rc:""};
    this.gmnChats[chatId] = gmnChat;
    return gmnChat;
  }
  private trimMessages(botChat: BotChat): void {
    if (botChat.messages.length > 9) {
      botChat.messages.shift();
    }
  }

  private shouldUseOpenAI(text: string): boolean {
    return /(gpt|(chat).*\b(gpt|openai))/i.test(text);
  }

  private shouldGenerateImage(text: string): boolean {
    return /(txt2img|(make|create|buat|cari|generate|bikin).*\b(gambar|foto|desain|design|image|photo|lukisan|ilustrasi|paint|illustration))/i.test(text);
  }

  private prepareMessages(botChat: BotChat): ChatCompletionMessageParam[] {
    const initialMessages: ChatCompletionMessageParam[] = [{
      role: "system",
      content: "Nama anda MasPung Bot, bot Telegram cerdas buatan Purwanto yang terintegrasi dengan ChatGPT buatan OpenAI. Jawablah pertanyaan dengan sesingkat mungkin."
    }];
    return [...initialMessages, ...botChat.messages];
  }

  private async processImageResponse(imageUrl: URL, text: string, aiService: OpenaiService): Promise<string | null> {
    try {
      const response = await axios.get(imageUrl.toString(), { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(response.data);
      const base64Image = imageBuffer.toString('base64');

      const reply = await aiService.visionAI(base64Image, text);
      return reply ?? null;
    } catch (error) {
      console.error("Failed to download or process image:", error);
      return null;
    }
  }
}

interface BotChat {
  id: string;
  user: string;
  date: string;
  messages: ChatCompletionMessageParam[];
}
interface GeminiChat {
  id: string;
  c : string;
  r : string;
  rc : string;
}