import { Telegraf } from "telegraf";
import LocalSession from "telegraf-session-local";
import { Command } from "./commands/command.class";
import { StartCommand } from "./commands/command.start";
import { DlCommand } from "./commands/command.dl";
import { IConfigService } from "./config/config.interface";
import { ConfigService } from "./config/config.service";
import { IBotContext } from "./context/context.interface";

class Bot {
  bot: Telegraf<IBotContext>;
  commands: Command[] = [];

  constructor( private readonly configService: IConfigService) {
    this.bot = new Telegraf<IBotContext>(this.configService.get("TOKEN")); 
    this.bot.use(new LocalSession({ database: "sessions.json" }).middleware());
  }

  async init() {
    this.commands = [
      new StartCommand(this.bot,this.configService),
      new DlCommand(this.bot,this.configService),
    ];
    for (const command of this.commands) {
      command.handle();
    }
    this.bot.launch();
  }
}

const config = new ConfigService();
const bot = new Bot(config);
bot.init();
