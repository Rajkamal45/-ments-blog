# ments. Blog CMS

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=for-the-badge&logo=supabase)
![AWS SES](https://img.shields.io/badge/AWS-SES-orange?style=for-the-badge&logo=amazon-aws)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

A modern, full-featured blog content management system built with Next.js, Supabase, and AWS SES.

[Live Demo](https://yoursite.com) · [Report Bug](https://github.com/Rajkamal45/-ments-blog/issues) · [Request Feature](https://github.com/Rajkamal45/-ments-blog/issues)

</div>

---

## ✨ Features

### 📝 Content Management
- **Rich Markdown Editor** - Write posts with full markdown support
- **Image Upload** - Direct image upload to Supabase storage
- **Draft & Publish** - Save drafts and publish when ready
- **Categories & Tags** - Organize content effectively
- **Custom Slugs** - SEO-friendly URLs

### 📊 Analytics
- **View Tracking** - Track post views (session-based)
- **Like System** - Readers can like posts (persisted in localStorage)
- **Real-time Stats** - See views and likes on each post

### 📧 Newsletter System
- **Subscriber Collection** - Beautiful subscription form
- **AWS SES Integration** - Send newsletters on publish
- **Email Templates** - Professional HTML email design
- **One-click Toggle** - Choose to send newsletter per post

### 🔐 Admin Dashboard
- **Secure Authentication** - Email-based admin access
- **Domain Restriction** - Only @ments.app emails allowed
- **Post Management** - Create, edit, delete posts
- **Subscriber Management** - View all subscribers

### 🎨 Modern UI
- **Responsive Design** - Works on all devices
- **Dark Admin Theme** - Sleek admin interface
- **Clean Blog Layout** - Reader-friendly design
- **Social Sharing** - Twitter, LinkedIn, WhatsApp, Copy Link

---

## 🖼️ Screenshots

<div align="center">

| Home Page | Blog Post |
|:---------:|:---------:|
| ![Home](https://via.placeholder.com/400x250/000/fff?text=Home+Page) | ![Post](https://via.placeholder.com/400x250/000/fff?text=Blog+Post) |

| Admin Dashboard | Post Editor |
|:---------------:|:-----------:|
| ![Dashboard](https://via.placeholder.com/400x250/000/fff?text=Dashboard) | ![Editor](https://via.placeholder.com/400x250/000/fff?text=Editor) |

</div>

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- AWS account (for SES)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rajkamal45/-ments-blog.git
   cd -ments-blog
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your credentials:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # AWS SES
   AWS_REGION=ap-south-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_SES_FROM_EMAIL=newsletter@yourdomain.com

   # Site
   NEXT_PUBLIC_SITE_URL=https://yoursite.com
   ```

4. **Run database migrations**
   
   Execute these SQL files in Supabase SQL Editor:
   - `sql/schema.sql` - Main tables
   - `sql/newsletter.sql` - Newsletter subscribers table

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open browser**
   ```
   http://localhost:3000
   ```

---

## 🗄️ Database Schema

### Tables

```sql
-- Blogs table
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  featured_image TEXT,
  category TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'draft',
  author_id UUID REFERENCES admins(id),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Admins table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

-- Newsletter subscribers table
CREATE TABLE newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'website'
);
```

---

## 📁 Project Structure

```
ments-blog/
├── app/
│   ├── page.tsx                    # Home page (blog list)
│   ├── admin/
│   │   ├── page.tsx                # Admin landing
│   │   ├── login/page.tsx          # Admin login
│   │   ├── signup/page.tsx         # Admin signup
│   │   ├── dashboard/page.tsx      # Dashboard
│   │   └── editor/
│   │       ├── page.tsx            # New post editor
│   │       └── [id]/page.tsx       # Edit post
│   ├── blog/
│   │   └── [slug]/page.tsx         # Blog post view
│   └── api/
│       └── send-newsletter/
│           └── route.ts            # Newsletter API
├── lib/
│   └── supabase/
│       └── supabaseClient.ts       # Supabase client
├── public/
├── .env.local
└── package.json
```

---

## 🔧 Configuration

### Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** to get your keys
3. Create a storage bucket named `blog_image` (public)
4. Run the SQL migrations in SQL Editor
5. Enable Row Level Security (RLS) policies

### AWS SES Setup

1. Go to AWS Console → SES
2. Verify your domain or email
3. Create IAM user with SES permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["ses:SendEmail", "ses:SendRawEmail"],
       "Resource": "*"
     }]
   }
   ```
4. Request production access (to send to unverified emails)

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router |
| **TypeScript** | Type safety |
| **Supabase** | Database, Auth, Storage |
| **AWS SES** | Email delivery |
| **Tailwind CSS** | Styling |

---

## 📝 Usage

### Creating a Post

1. Go to `/admin` and login
2. Click **New Post** in dashboard
3. Add title, content (markdown), excerpt
4. Upload featured image
5. Select category and add tags
6. Toggle **Send Newsletter** if needed
7. Click **Publish** 🚀

### Markdown Support

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold** and *italic*

`inline code`

```javascript
// Code block
const hello = "world";
```

![Image](url)
[Link](url)

> Blockquote

- List item
```

---

## 🤝 Contributing

Contributions are welcome! 

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Rajkamal**

- GitHub: [@Rajkamal45](https://github.com/Rajkamal45)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [AWS](https://aws.amazon.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

<div align="center">

⭐ Star this repo if you found it helpful!

Made with ❤️ by [Rajkamal](https://github.com/Rajkamal45)

</div>
