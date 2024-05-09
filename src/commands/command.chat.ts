import { Telegraf,Input, Context } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { IConfigService } from "../config/config.interface";
import { Command } from "./command.class";
import { message } from 'telegraf/filters';
import { OpenaiService } from "../ai/openai.service";
import https from "https";
import { ChatCompletionMessageParam, ChatCompletionMessage } from "openai/resources";

export class ChatCommand extends Command {
  private botchats: { [key: string]: BotChat };
  constructor(bot: Telegraf<IBotContext>,private readonly configService: IConfigService ) {
    super(bot);
    this.botchats = {};
  }
  handle(): void {
    const ai = new OpenaiService(this.configService)
    this.bot.on(message("text"),async (ctx) => {
      const d = new Date
      const date = d.toLocaleDateString('id', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      let botchat = this.botchats[ctx.chat.id];
      let text = ctx.message.text
      if(botchat){
        botchat.messages.push({'role':"user","content":text});
        if (botchat.messages.length > 9) {
            botchat.messages.shift();
        }
      }else{
        botchat = {
          id: ctx.chat.id.toString(),
          user: ctx.message.from.username as string,
          date: date,
          messages: [{ 'role': "user", 'content': text }]
        };
        this.botchats[ctx.chat.id] = botchat;
      }
      if (/(txt2img|(make|create|buat|cari|generate|bikin).*\b(gambar|foto|desain|design|image|photo|lukisan|ilustrasi|paint|illustration))/i.test(text)) {
        let rep:any = await ai.generateImage(text)
        ctx.replyWithPhoto(Input.fromURLStream(rep))
      }else{
        const initialMessages:ChatCompletionMessageParam[] = [{"role":"system","content":"Nama anda MasPung Bot, bot Telegram cerdas buatan Purwanto yang terintegrasi dengan ChatGPT buatan OpenAI. Jawablah pertanyaan dengan sesingkat mungkin."}
        ]
        const combinedMessages = [...initialMessages, ...botchat.messages];
        //console.log(combinedMessages)
        let rep:any = await ai.chatCompletion(combinedMessages)
        if (typeof(rep)==='string'){
          botchat.messages.push({'role':"assistant","content":rep});
          if (botchat.messages.length > 9) {
              botchat.messages.shift();
          }
        }
        ctx.reply(rep)
      }
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
export interface BotChat{
  id:string,
  user:string,
  date:string,
  messages:ChatCompletionMessageParam[]
}
