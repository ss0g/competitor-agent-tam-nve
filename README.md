# Competitor Research Agent

An AI-powered competitor research and analysis tool that helps businesses track and analyze their competitors' activities, market trends, and strategic changes.

## Features

- **Automated Competitor Analysis**: Continuously monitor and analyze competitor websites and digital presence
- **AI-Powered Insights**: Leverage AWS Bedrock, OpenAI, and Mistral AI for deep analysis
- **Comprehensive Reports**: Generate detailed reports with executive summaries, trend analysis, and strategic recommendations
- **Version Control**: Track changes and maintain report history with versioning
- **Scheduled Reports**: Automate report generation with customizable schedules
- **Email Notifications**: Get notified when new reports are generated
- **Modern UI**: Clean and intuitive interface built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js, Prisma, PostgreSQL
- **AI/ML**: AWS Bedrock, OpenAI API, Mistral AI
- **Authentication**: NextAuth.js
- **Testing**: Jest, React Testing Library, Playwright
- **Infrastructure**: AWS, Vercel (optional)

## Prerequisites

- Node.js 18+
- PostgreSQL
- AWS Account with Bedrock access
- OpenAI API key (optional)
- Mistral AI API key (optional)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/competitor-research-agent.git
   cd competitor-research-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your environment variables in `.env`

4. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# AWS
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Email (optional)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email"
SMTP_PASSWORD="your-password"

# AI Models (optional)
OPENAI_API_KEY="your-openai-key"
MISTRAL_API_KEY="your-mistral-key"
```

## Testing

Run the test suite:

```bash
# Unit and integration tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/             # Core business logic
│   ├── pages/           # Next.js pages
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions
├── prisma/              # Database schema
├── public/             # Static assets
├── e2e/                # E2E tests
└── __tests__/          # Unit/integration tests
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
