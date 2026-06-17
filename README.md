# UBC Course Explorer

A full-stack data visualization tool for exploring UBC course and campus facilities data.

## Features

- **Course enrollment trends** — bar chart of enrollment across departments
- **Math grade distributions** — grade breakdown for MATH courses
- **Geographical clustering** — interactive map of UBC buildings using OpenLayers
- **Building type breakdown** — chart of campus facility categories

## Tech stack

**Backend:** Node.js, Express, TypeScript  
**Frontend:** React 19, TypeScript, Vite, Material UI, D3, Recharts, OpenLayers

## Getting started

### Prerequisites

- Node.js v24
- Yarn 1.22

### Install dependencies

```bash
yarn install
cd frontend && yarn install
```

### Run in development

```bash
# From the frontend/ directory — starts both Vite dev server and backend
yarn dev
```

### Build

```bash
# Backend
yarn build

# Frontend
cd frontend && yarn build
```

### Run tests

```bash
yarn test
```
