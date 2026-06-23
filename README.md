# Frame Translate Plugin

A Figma plugin prototype that translates all text layers inside a selected frame, applies the translated copy back into the design, and stores validated translations for future reference.

Built during my internship as an exploration of AI-assisted localization workflows for design teams.

## Demo

![Demo thumbnail](./frame-translate-plugin-demo-thumbnail.png)

Demo video: `frame-translate-plugin-demo.mp4`

## What It Does

- Select a Figma frame
- Extract all text layers inside that frame
- Choose a target language
- Translate the text using an AI translation service
- Apply the translated text back into the Figma design
- Validate or revert translations
- Store approved translations in Supabase

## Tech Stack

- Figma Plugin API
- TypeScript
- Preact
- Vite
- AWS Bedrock / Claude
- Supabase
- esbuild

## Project Status

This project is an internship prototype. The core plugin flow works, but the original AWS credentials belonged to the internship environment and are no longer used.

For a production version, the AI translation request should be moved behind a secure backend or serverless function. API keys should not be exposed in frontend/plugin code.

## How To Run Locally

Install dependencies:

```bash
npm install
