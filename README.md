MPJNPMU Team Portal 🌊
A modern, responsive team management portal built with Next.js, Supabase, and Tailwind CSS. Features beautiful water-themed design with glass morphism effects.

Show Image

✨ Features
🏠 Home Dashboard
Team Member Display: View all team members with their current status
Real-time Attendance: See who's present or absent today
Contact Information: Access phone numbers and designations
Live Updates: Automatic refresh every 30 seconds
Statistics: Quick stats showing team metrics
📋 Task Tracker
Task Creation: Admins and collaborators can create and assign tasks
Progress Tracking: Monitor task status (Open, In Progress, Blocked, Done)
Due Date Management: Set and track due dates with overdue alerts
Expected Completion: Team members can update expected completion dates
Role-based Access: Users can only update tasks assigned to them
👤 User Profile
Personal Information: Update name, phone, and designation
Attendance Status: Mark yourself present or absent for the day
Account Details: View account creation date and current role
Profile Statistics: Track your activity and updates
🛡️ Admin Panel (Team Leaders Only)
User Management: Promote/demote users between admin and collaborator roles
User Deletion: Remove users and their associated tasks
Task Management: View and delete any task in the system
System Overview: Complete administrative control
🎨 Design & UX
Water Theme: Beautiful light blue color palette inspired by water
Glass Morphism: Modern frosted glass effects with backdrop blur
Responsive Design: Optimized for desktop, tablet, and mobile devices
Smooth Animations: Subtle transitions and micro-interactions
Loading States: Elegant loading indicators and skeleton screens
🏗️ Tech Stack
Frontend: Next.js 14, React 18, Tailwind CSS 3
Backend: Supabase (PostgreSQL + Auth + Real-time)
Deployment: Vercel
Icons: Lucide React
Data Fetching: SWR for caching and real-time updates
Styling: Custom CSS with Tailwind utilities
🚀 Quick Start
Prerequisites
GitHub account
Vercel account
Supabase account
1. Clone & Setup
bash
# Create new repository on GitHub named 'mpjnpmu-website'
# Upload all project files to the repository
2. Supabase Setup
Create new Supabase project
Run the SQL schema from database-schema.sql
Get your project URL and anon key from Settings → API
3. Vercel Deployment
Connect GitHub repository to Vercel
Add environment variables:
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
Deploy!
4. Configure Authentication
In Supabase: Authentication → Settings → Site URL
Add your Vercel domain: https://your-site.vercel.app
Sign up first user and promote to admin in database
📁 Project Structure
mpjnpmu-website/
├── components/           # React components
│   ├── AuthForm.jsx     # Login/signup modal
│   ├── UserProfile.jsx  # User profile management
│   ├── TaskTracker.jsx  # Task management interface
│   └── AdminPanel.jsx   # Admin dashboard
├── lib/                 # Utility libraries
│   └── supabase.js     # Supabase client configuration
├── pages/              # Next.js pages
│   ├── _app.js         # App wrapper with global state
│   └── index.js        # Main dashboard page
├── styles/             # Styling
│   └── globals.css     # Global styles and themes
├── package.json        # Dependencies and scripts
├── tailwind.config.js  # Tailwind configuration
├── postcss.config.js   # PostCSS setup
├── next.config.js      # Next.js configuration
└── database-schema.sql # Complete database setup
🔐 User Roles & Permissions
Team Leader (Admin)
✅ Full system access
✅ Create, edit, delete tasks
✅ Manage user roles
✅ Delete users and tasks
✅ View all data
✅ Administrative controls
Collaborator
✅ Create and assign tasks
✅ Update own profile
✅ Update assigned task status
✅ View team members
❌ Cannot manage user roles
❌ Cannot delete users
Regular Member
✅ Update own profile
✅ Mark attendance
✅ Update assigned task status
✅ View team dashboard
❌ Cannot create tasks
❌ Cannot manage users
🎨 Design System
Color Palette
css
/* Water Theme */
--water-50: #f0f9ff    /* Lightest blue */
--water-100: #e0f2fe   /* Very light blue */
--water-400: #38bdf8   /* Medium blue */
--water-500: #0ea5e9   /* Primary blue */
--water-700: #0369a1   /* Dark blue */
--water-900: #0c4a6e   /* Darkest blue */

/* Ocean Accents */
--ocean-400: #2dd4bf   /* Teal */
--ocean-500: #14b8a6   /* Primary teal */
Typography
Font: Inter (Google Fonts)
Weights: 300, 400, 500, 600, 700
Scale: Responsive typography with Tailwind utilities
Components
Glass Cards: Semi-transparent with backdrop blur
Buttons: Gradient backgrounds with hover effects
Inputs: Focused states with color transitions
Status Badges: Color-coded for different states
📊 Database Schema
Profiles Table
sql
id (UUID, PK)           -- User ID from auth.users
full_name (TEXT)        -- User's full name
email (TEXT)            -- Email address
phone (TEXT)            -- Phone number
designation (TEXT)      -- Job title/role
present (BOOLEAN)       -- Daily attendance
role (TEXT)            -- 'admin' or 'collaborator'
created_at (TIMESTAMP)  -- Account creation
updated_at (TIMESTAMP)  -- Last profile update
Tasks Table
sql
id (BIGSERIAL, PK)           -- Task ID
title (TEXT)                 -- Task title
assigned_to (UUID, FK)       -- Assigned user ID
assigned_to_name (TEXT)      -- Assigned user name
assigned_by (UUID, FK)       -- Creator user ID  
assigned_by_name (TEXT)      -- Creator name
assigned_date (TIMESTAMP)    -- Creation date
due_date (TIMESTAMP)         -- Due date
current_status (TEXT)        -- Open/In Progress/Blocked/Done
expected_completion_date     -- User estimated completion
created_at (TIMESTAMP)      -- Record creation
updated_at (TIMESTAMP)      -- Last update
🔒 Security Features
Row Level Security (RLS)
Users can only edit their own profiles
Task updates restricted to assigned users or admins
Role-based access control for administrative functions
Secure API endpoints with Supabase policies
Authentication
Email/password authentication via Supabase Auth
Automatic profile creation on signup
Session management with refresh tokens
Secure environment variable handling
📱 Mobile Responsive
Breakpoints: Mobile-first design with responsive utilities
Navigation: Collapsible mobile menu
Tables: Horizontal scroll on small screens
Forms: Stack vertically on mobile devices
Touch: Optimized button sizes for touch interfaces
🔧 Development
Local Development
bash
# Install dependencies
npm install

# Set environment variables in .env.local
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key

# Run development server
npm run dev
Building
bash
# Build for production
npm run build

# Start production server
npm start
🐛 Troubleshooting
Common Issues
Build Errors

Verify all files are in correct directories
Check package.json dependencies
Ensure environment variables are set
Authentication Issues

Check Supabase redirect URLs
Verify environment variables
Confirm database policies are created
Permission Errors

Check user role in profiles table
Verify RLS policies are active
Ensure proper database permissions
📞 Support
For technical support:

Check Vercel deployment logs
Review Supabase logs and metrics
Verify environment variables
Test database connectivity
📄 License
MIT License - feel free to use this project for your team management needs!

Built with ❤️ for the MPJNPMU Team

