import { Markup, Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { IConfigService } from "../config/config.interface";
import { Command } from "./command.class";

export class StartCommand extends Command {
  constructor(bot: Telegraf<IBotContext>,configService: IConfigService) {
    super(bot,configService);
  }

  handle(): void {
    this.bot.start(async (ctx) => {
      ctx.reply(
        "👋 Halo saya adalah bot downloader, apakah kamu ingin tahu perintah untuk mendownload video/audio?",
        Markup.inlineKeyboard([
          Markup.button.callback("Ya!", "is_yes"),
          Markup.button.callback("Tidak Perlu", "is_no"),
        ])
      );
    });

    this.bot.action("is_yes", (ctx) => {
      ctx.session.isYes = true;
      ctx.editMessageText("Untuk mendownload video/audio, gunakan perintah berikut:\n\n /dl <spasi> link \n\ncontoh: \n\n/dl https://www.facebook.com/share/r/uTWmym5nx9FcYWnk/?mibextid=0VwfS7");
    });

    this.bot.action("is_dislike", (ctx) => {
      ctx.session.isYes = false;
      ctx.editMessageText("Baiklah, sepertinya anda sudah tahu perintahnya, Happy Download!");
    });
  }
}
