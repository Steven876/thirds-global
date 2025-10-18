# Thirds - Structure your day around your energy

A production-ready web application that helps you optimize productivity by organizing your day into three energy-based blocks: morning, afternoon, and night.

## 🚀 Features

- **Energy-Based Scheduling**: Organize your day around your natural energy patterns
- **Circular Timer**: Beautiful, intuitive timer with energy level color coding
- **AI Insights**: Personalized recommendations based on your work patterns
- **Schedule Builder**: Create and manage recurring schedules across energy blocks
- **Analytics Dashboard**: Track your productivity with detailed reports and charts
- **Responsive Design**: Laptop-first design that works on all devices
- **Real-time Updates**: Live timer and session tracking

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ with App Router, React, TypeScript
- **Styling**: Tailwind CSS with custom gradients and animations
- **Database**: Supabase (PostgreSQL + Auth)
- **Animations**: Framer Motion
- **HTTP Client**: Axios
- **Code Quality**: ESLint + Prettier

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd thirds-global
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   - Create a new Supabase project
   - Run the SQL commands from `db/schema.sql` in your Supabase SQL editor
   - Enable Row Level Security (RLS) as described in the schema

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

The application uses the following main tables:

- **profiles**: User profile information and preferences
- **schedules**: User-defined schedules for each energy block
- **sessions**: Individual work sessions and their data
- **reports**: Daily analytics and AI-generated insights

See `db/schema.sql` for the complete schema with RLS policies.

## 🏗️ Project Structure

```
thirds-global/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── home/              # Dashboard page
│   ├── schedule/          # Schedule builder
│   ├── reports/           # Analytics dashboard
│   └── settings/          # User settings
├── components/            # Reusable UI components
├── lib/                   # Utilities and configurations
├── styles/                # Custom CSS and gradients
├── db/                    # Database schema
└── public/                # Static assets
```

## 🎨 Design System

The app uses a custom design system with:

- **Energy-based color coding**: High (orange), Medium (amber), Low (slate)
- **Time-of-day gradients**: Morning, afternoon, and night themes
- **Consistent spacing**: Using Tailwind's spacing scale
- **Accessible components**: ARIA labels and keyboard navigation
- **Smooth animations**: Framer Motion for delightful interactions

## 🔧 Configuration

### Tailwind CSS
Custom configuration in `tailwind.config.ts` includes:
- Energy-based color palettes
- Custom gradients for time-of-day theming
- Animation keyframes for smooth transitions

### Supabase
- Row Level Security (RLS) enabled on all tables
- User-specific data access policies
- Real-time subscriptions for live updates

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔒 Security

- Row Level Security (RLS) on all database tables
- User authentication handled by Supabase Auth
- API routes protected with user validation
- Input validation and sanitization

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

## 🗺️ Roadmap

- [ ] Real-time collaboration features
- [ ] Mobile app (React Native)
- [ ] Advanced AI insights with machine learning
- [ ] Team workspaces and shared schedules
- [ ] Integration with popular productivity tools
- [ ] Offline support with PWA features

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Database powered by [Supabase](https://supabase.com/)
- Animations by [Framer Motion](https://www.framer.com/motion/)
- Icons by [Lucide React](https://lucide.dev/)

---

**Thirds** - Structure your day around your energy. ⚡