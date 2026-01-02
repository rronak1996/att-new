# QR Code Attendance System

A secure web-based attendance system for colleges where teachers can generate lecture-wise QR codes and students can mark attendance by scanning the QR code with location verification.

## Features

### 👨‍🏫 Teacher Features
- Login with secure JWT authentication
- Create lectures with classroom GPS coordinates
- Generate unique QR codes (5-minute expiry)
- View attendance records
- Export attendance as CSV
- Regenerate expired QR codes

### 👨‍🎓 Student Features
- Scan QR code to open attendance page
- Location verification using browser GPS
- Simple form (name + roll number)
- Real-time QR expiry countdown
- Clear success/error messages

### 🔐 Security
- Time-limited QR codes (5 minutes)
- One attendance per student per lecture
- GPS location must be within allowed radius
- JWT-protected teacher routes

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
```

Open: **http://localhost:3000**

### Default Login
| Username | Password |
|----------|----------|
| teacher  | teacher123 |

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: JSON file storage
- **Frontend**: HTML, CSS, JavaScript
- **Auth**: JWT (jsonwebtoken)
- **QR**: qrcode library

## Project Structure

```
├── server.js              # Express server
├── package.json           # Dependencies
├── database/
│   └── init.js            # Database manager
├── routes/
│   ├── auth.js            # Authentication
│   ├── lectures.js        # Lecture CRUD
│   └── attendance.js      # Attendance marking
├── middleware/
│   └── auth.js            # JWT verification
├── utils/
│   └── location.js        # GPS distance calculation
└── public/
    ├── index.html         # Landing page
    ├── css/styles.css     # Design system
    ├── js/                # Frontend scripts
    ├── teacher/           # Teacher pages
    └── student/           # Student pages
```

## Deployment

### Render.com (Recommended)
1. Push to GitHub
2. Create new Web Service on Render
3. Connect your repository
4. Set start command: `npm start`
5. Deploy!

### Railway.app
1. Push to GitHub
2. Import project on Railway
3. Auto-deploys on push

## License

MIT
