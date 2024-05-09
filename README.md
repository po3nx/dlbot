# My Telegram Bot

This repository contains a Telegram bot using the Telegraf framework, written in TypeScript.

## Configuration, Installation and Usage

### Configuration
Before running the bot, you need to set up the necessary environment variables. Below are the required variables you’ll need to configure:

**Environment Variables :**

**TOKEN** - This is your Telegram Bot Token, which you receive from the BotFather when you create your bot on Telegram.
**OPENAI_API_KEY** - This is your OpenAI API Key
**YT_DLP_PATH** - This is the file path to your yt-dlp executable, which is used for downloading media. Ensure that yt-dlp is properly installed on your system.

```
TOKEN=your_telegram_bot_token_here
OPENAI_API_KEY=your_openai_api_key
YT_DLP_PATH=path_to_yt_dlp_executable
```
Replace your_telegram_bot_token_here with the actual token provided by BotFather.
Replace your_openai_api_key with the actual api key from OpenAI 
Replace path_to_yt_dlp_executable with the actual path to the yt-dlp executable on your system.

**Setting Environment Variables:**

- #### On Unix-based systems (Linux, macOS):

You can set these variables in your terminal session or add them to your shell configuration file (e.g., .bashrc, .zshrc).

```bash
export TOKEN='your_telegram_bot_token_here'
export YT_DLP_PATH='path_to_yt_dlp_executable'
export OPENAI_API_KEY='your_openai_api_key'
```
- #### On Windows:

Set these variables using the command prompt or set them permanently through the System Properties.

```bash
set TOKEN=your_telegram_bot_token_here
set OPENAI_API_KEY=your_openai_api_key
set YT_DLP_PATH=path_to_yt_dlp_executable
```

### Installation 
You can use either Yarn or npm to install dependencies, build, and run the bot.

#### Using Yarn

```bash
yarn install       # Install dependencies
yarn build         # Compile TypeScript to JavaScript
yarn start         # Start the bot
```
#### Using npm
```bash
npm install        # Install dependencies
npm run build      # Compile TypeScript to JavaScript
npm run start      # Start the bot
```

#### Development
To run the bot in development mode with hot reloading:
```bash
yarn dev           # If using Yarn
npm run dev        # If using npm
```
