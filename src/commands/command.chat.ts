import { Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { IConfigService } from "../config/config.interface";
import { Command } from "./command.class";
import { message } from 'telegraf/filters'
import { OpenaiService } from "../ai/openai.service"
const https = require("https");

export class ChatCommand extends Command {
  constructor(bot: Telegraf<IBotContext>,private readonly configService: IConfigService) {
    super(bot);
  }

  handle(): void {
    const ai = new OpenaiService(this.configService)
    this.bot.on(message("text"),async (ctx) => {
        let text = ctx.message.text
        console.log(text)
        const rep:any = await ai.chatCompletion(text)
        ctx.reply(rep)
    });
    this.bot.on(message("photo"),async (ctx) => {
        let text:any = ctx.message.caption || "Jelaskan Gambar berikut"
        let imageId:any = ctx.message.photo.pop()?.file_id
        const imageUrl = await ctx.telegram.getFileLink(imageId);
        https.get(imageUrl, async (response:any) => {
            const chunks: any[] = [];
            response.on('data', async (chunk:any) => {
              chunks.push(chunk);
            }).on('end', async () => {
              const imageBuffer = Buffer.concat(chunks);
              const base64Image = imageBuffer.toString('base64');
              const rep:any = await ai.visionAI(base64Image,text)
              ctx.reply(rep)
            });
          }).on('error', (error:any) => {
            console.error("Failed to download or convert image:", error);
          });
    });
  }
}
