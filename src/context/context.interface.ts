import { Context } from "telegraf";

export interface SessionData {
  isYes: boolean;
}

export interface IBotContext extends Context {
  session: SessionData;
}
