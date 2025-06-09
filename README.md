# RiDesk - Resource Management System

A modern resource and desk management system for workplaces, featuring mission-based task management and resource allocation.

## Features

- User Authentication
- Mission Management
- Resource Allocation
- Real-time Updates
- Profile Management
- Admin Dashboard

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Supabase
- Vite

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start the development server: `npm run dev`

## Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Project Structure

```
RiDesk/
│
├── pages/
│   ├── missionForm.page.tsx    # Post a mission
│   └── claim.page.tsx          # Claim a mission
│
├── backend/
│   ├── createMission.js        # Handle new missions
│   └── claimMission.js         # Claim logic
│
├── components/
│   ├── MissionCard.tsx
│   ├── ClaimForm.tsx
│   └── AsyncLoader.tsx
│
├── assets/
│   └── styles.css
│
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request