# SmartStudy AI — Real AI Assistant Setup

This version keeps the existing SmartStudy AI website and replaces the predefined Assistant replies with a real AI API connection.

## 1. Install Node.js

Install a current Node.js LTS version if Node.js is not already installed.

Check in VS Code Terminal:

```powershell
node -v
npm -v
```

## 2. Open the SmartStudy_AI_V4 folder

Open this folder in VS Code:

`SmartStudy_AI_V4`

## 3. Install the server packages

Open VS Code Terminal in that folder and run:

```powershell
npm install
```

## 4. Create your private .env file

Copy `.env.example` and rename the copy to:

`.env`

Then put your own API key in `.env`:

```text
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.6-luna
PORT=3000
```

Do NOT send the API key to anyone or paste it into `script.js` or `index.html`.

## 5. Start SmartStudy AI

In the same terminal:

```powershell
npm start
```

You should see:

`SmartStudy AI running at http://localhost:3000`

## 6. Open the website

Do NOT double-click `index.html` for the real-AI version.

Open this in Edge/Chrome:

`http://localhost:3000`

## 7. Test the Assistant

Try:

- Explain multiplexing
- Explain TDM in detail
- Give me a 5-mark answer
- Make it easier
- Give me an example

The Assistant sends the conversation history to the backend, so follow-up questions have context.

## Important

The OpenAI API is separate from a ChatGPT subscription and requires API access/usage. API costs depend on the model and usage.
