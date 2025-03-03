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
    const firstName = ctx.from.first_name || ""; 
    const lastName = ctx.from.last_name || "";
    const text = replyText ? `${ctx.message.text}\nQuoted Message:'${replyText}'` : ctx.message.text;
    const jam = this.getCurrentDateTime();

    let botChat = this.botChats[chatId] ?? this.initializeBotChat(chatId, username, formattedDate);
    let gmnChat = this.gmnChats[chatId] ?? this.initializeGeminiChat(chatId, formattedDate);
    botChat.messages.push({ role: "user", content: `${firstName} ${lastName} (@${username}) ${jam}: ${text}` });
    this.trimMessages(botChat);
    if(this.shouldAnswer(text)){
      if (this.shouldGenerateImage(text)) {
        const loadingMsg = await ctx.reply('⚠️ Gambar sedang diproses, Mohon ditunggu 🌐');
        const imageUrl = await aiService.generateImage(text);
        if (imageUrl) {
          botChat.messages.push({ role: "assistant", content: "Gambar telah dibuat, sesuai deskripsi anda" });
          this.trimMessages(botChat);
          ctx.replyWithPhoto(imageUrl);
        }else{
          botChat.messages.push({ role: "assistant", content: "Gagal Membuat Gambar" });
          ctx.reply("Gagal Membuat Gambar");
        }
        await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
      } else  if (this.shouldUseGemini(text)) {
        await gemini.getAPI();
        gemini.c = gmnChat.c
        gemini.r = gmnChat.r
        gemini.rc = gmnChat.rc
        const response = await gemini.ask(text)
        gmnChat.c = gemini.c
        gmnChat.r = gemini.r
        gmnChat.rc = gemini.rc
        ctx.reply(response)
      } else {
        const response = await aiService.chatCompletion(await this.prepareMessages(botChat,text));
        if (response) {
          botChat.messages.push({ role: "assistant", content: response });
          this.trimMessages(botChat);
          ctx.reply(response);
        }
      }
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

  private shouldUseGemini(text: string): boolean {
    return /(gemini|(google).*\b(bard|gemini))/i.test(text);
  }
  private shouldAnswer(text: string): boolean {
    return /\b(bot|bot\?|bot!|bot\.)\b|@maspungbot/i.test(text);
  }
  private shouldGenerateImage(text: string): boolean {
    return /(txt2img|(make|create|buat|cari|generate|bikin).*\b(gambar|foto|desain|design|image|photo|lukisan|ilustrasi|paint|illustration))/i.test(text);
  }

  private async prepareMessages(botChat: BotChat,text:string): Promise<ChatCompletionMessageParam[]> {
    let additional = "";
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=google_key&cx=google_cx&q=${text}`;
      const response = await axios.get(url);
      const searchResult = response.data.items;
      const result = {
        keyword: text,
        items: searchResult.map((item: { title: string; snippet: string; }) => ({
          title: item.title,
          snippet: item.snippet
        }))
      };
      const resultString = JSON.stringify(result, null, 2);
      if (searchResult) {
        console.log(resultString);
        additional = "Silakan gunakan informasi tambahan dari hasil pencarian Google ini untuk menjawab pertanyaan pengguna jika diperlukan dan relevan dengan riwayat obrolan. Jika tidak, cukup jawab berdasarkan pengetahuan Anda: '" + resultString + "'";
      }
    } catch (error) {
      console.log(error);
    }
    const initialMessages: ChatCompletionMessageParam[] = [{
      role: "system",
      content: "Nama anda MasPung Bot, bot Telegram cerdas buatan Purwanto yang terintegrasi dengan ChatGPT buatan OpenAI. anda berada di dalam sebuah group telegram ataupun private chat, nama dan waktu chat terdapat di awal setiap kalimat dari user, anda tidak perlu menyebut nama anda atau menggunakan format chat nama nomor dan tanggal pada saat membalas chat, langsung saja ke kalimat balasan,  Jawablah pertanyaan dengan sesingkat mungkin."
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
  private getCurrentDateTime() {

    const localDate = new Date();

    const day = String(localDate.getDate()).padStart(2, '0');
    const month = String(localDate.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = localDate.getFullYear();

    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    const seconds = String(localDate.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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