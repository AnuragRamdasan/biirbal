# Create Next.js app with TypeScript
npx create-next-app@latest slack-article-reader --typescript --tailwind --eslint

cd slack-article-reader

# Install dependencies
npm install @slack/bolt @slack/web-api @prisma/client aws-sdk axios 
npm install @stripe/stripe-js stripe
npm install cheerio openai # for text extraction and TTS
npm install next-auth @auth/prisma-adapter
npm install @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom --save-dev 