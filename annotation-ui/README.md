# Annotation UI

A frontend for users to annotate text data, built with React, TypeScript and Mantine UI.

## Overview

This application provides a user interface for annotating text conversations. It's designed to work with the annotation backend API and provides a restricted set of features compared to the admin UI.

### Features

- User authentication
- View projects and conversations
- Annotate messages with tags
- View all annotations in a conversation
- Responsive design for various screen sizes

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Access to the annotation backend API

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with:

```
VITE_API_URL=http://localhost:8000  # URL to the backend API
```

4. Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is in use).

## Docker Usage

This application can be run using Docker:

1. Build the Docker image:

```bash
docker build -t annotation-ui .
```

2. Run the container:

```bash
docker run -p 3001:80 -e VITE_API_URL=http://localhost:8000 annotation-ui
```

The app will be available at `http://localhost:3001`.

## Docker Compose

For development with the complete stack, use Docker Compose:

```bash
docker-compose up -d
```

This will start:
- The annotation backend API at `http://localhost:8000`
- The admin UI at `http://localhost:3000`
- This user UI at `http://localhost:3001`
- A PostgreSQL database

## Project Structure

```
src/
├── api/            # API client functions
├── components/     # Reusable UI components
├── config/         # Configuration and constants
├── contexts/       # React contexts
├── hooks/          # Custom React hooks
├── pages/          # Page components
└── utils/          # Utility functions
```

## Authentication

The app uses JSON Web Tokens (JWT) for authentication. The token is stored in localStorage and automatically included in API requests.

## User Restrictions

Unlike the admin UI, this interface:
- Does not allow file uploads
- Does not provide access to administrative functions
- Restricts certain features to regular users

## License

This project is licensed under the MIT License.
