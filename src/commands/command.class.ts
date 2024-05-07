import { Telegraf } from "telegraf";
import { IBotContext } from "../context/context.interface";
import { IConfigService } from "../config/config.interface";

export abstract class Command {
  constructor(public bot: Telegraf<IBotContext>,public readonly configService: IConfigService) {}

  abstract handle(): void;
}
