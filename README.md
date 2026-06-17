# UBC Course Explorer

A full-stack data visualization tool for exploring UBC course and campus facilities data.

## Features

- **Course enrollment trends** — bar chart of enrollment across departments
- **Math grade distributions** — grade breakdown for MATH courses
- **Geographical clustering** — interactive map of UBC buildings using OpenLayers
- **Building type breakdown** — chart of campus facility categories

## Tech stack

**Backend** ([backend/](backend/)): Node.js, Express, TypeScript  
**Frontend** ([frontend/](frontend/)): React 19, TypeScript, Vite, Material UI, D3, Recharts, OpenLayers

## Project layout

```
backend/    Express + TypeScript API (controllers, services, repositories)
frontend/   React + Vite single-page app
```

## Getting started

### Prerequisites

- Node.js v24
- Yarn 1.22

### Install dependencies

```bash
cd backend && yarn install
cd ../frontend && yarn install
```

### Run in development

```bash
# From frontend/ — starts both the Vite dev server and the backend
yarn dev
```

### Build

```bash
cd backend && yarn build
cd ../frontend && yarn build
```

### Run tests

```bash
cd backend && yarn test
```
