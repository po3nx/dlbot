import { Markup, Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { Command } from "./command.class";
import { IConfigService } from "../config/config.interface";
import  validUrl  from "valid-url";
import { v4 as uuidv4 } from "uuid"
import { exec } from "child_process"
import fs from "fs"
import path from "path"

export class DlCommand extends Command {
  constructor(bot: Telegraf<IBotContext>,private readonly configService: IConfigService) {
    super(bot);
  }

  handle(): void {
    this.bot.command("dl",async (ctx) => {
      let text:string = ctx.message.text.trim().split(' ').pop()!;
      if (validUrl.isUri(text)) {
        console.log(text)
        const loadingMsg = await ctx.reply('⚠️ Download file sedang diproses, Mohon ditunggu 🌐');
        await ctx.sendChatAction('upload_video');
        const randomID = uuidv4();
        const outputFolder = 'downloads';
        const outputFile = path.join(outputFolder, `${randomID}.%(ext)s`);
        const dlpPath = this.configService.get("YT_DLP_PATH")

        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder);
        }
        const filenameCommand = `${dlpPath} --get-filename -o "${outputFile}" "${text}" --netrc`;
        console.log(`Executing command to get filename: ${filenameCommand}`);

        exec(filenameCommand, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Error getting filename: ${error}`);
                ctx.reply('🚫 Error! Gagal mendapatkan nama file, silahkan coba lagi!');
                ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
                return;
            }
            const fullPath = stdout.trim();

            console.log(`Filename received: ${fullPath}`);

            const downloadCommand = `${dlpPath} -o "${fullPath}" "${text}" --netrc`;
            console.log(`Executing download command: ${downloadCommand}`);

            exec(downloadCommand, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Download error: ${error}`);
                    await ctx.reply('🚫 Download Error, silahkan coba lagi, atau coba link yang lain!');
                    await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
                    return;
                }

                console.log(`Download completed: ${fullPath}`);

                const stats = fs.statSync(fullPath);
                const fileSizeInBytes = stats.size;
                const fileSizeInMegabytes = fileSizeInBytes / (1024*1024);
                if (fileSizeInMegabytes <= 50) {
                    await ctx.replyWithVideo({ source: fs.createReadStream(fullPath) });
                    console.log(`File sent: ${fullPath}`);
                } else {
                    await ctx.reply('🚫 Error! Ukuran file terlalu besar 📦 (lebih dari 50Mb).');
                    console.log(`File too large: ${fullPath}`);
                }
                fs.unlinkSync(fullPath);
                console.log(`File deleted after sending: ${fullPath}`);
                await ctx.telegram.deleteMessage(ctx.chat.id, loadingMsg.message_id);
            });
        });
      } else {
        await ctx.reply('🚫 Error! Link yang anda kirim tidak valid.');
      }
    });

  }
}
