# QR Code Based College Attendance System

A secure web-based attendance system where teachers generate lecture-specific QR codes and students mark attendance via QR scan with GPS location verification.

## 🚀 Features

### Teacher Features
- 🔐 Secure login with JWT authentication
- 📝 Create lectures with date, subject, and lecture number
- 📍 Set classroom GPS coordinates and allowed radius
- 🔲 Generate QR codes (5-minute expiry)
- 📊 View attendance records per lecture
- 📥 Export attendance as CSV

### Student Features
- 📱 Scan QR code to open attendance page
- 📍 GPS location verification
- ✍️ Simple form (name + roll number)
- ✅ Clear success/error messages
- ⏱️ Countdown timer showing QR expiry

### Security
- ⏰ QR codes expire after 5 minutes
- 🔒 One attendance per student per lecture
- 📍 Location must be within allowed radius
- 🛡️ JWT-protected teacher routes

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: JSON file-based (no native modules needed)
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **QR Generation**: qrcode npm package
- **Auth**: JWT (jsonwebtoken) + bcryptjs

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/qr-attendance-system.git

# Navigate to project directory
cd qr-attendance-system

# Install dependencies
npm install

# Start the server
npm start
```

Server runs at: **http://localhost:3000**

## 🔑 Default Credentials

| Username | Password |
|----------|----------|
| teacher  | teacher123 |

> ⚠️ Change the default password after first login!

## 📱 Usage

### For Teachers
1. Navigate to `/teacher/login.html`
2. Login with credentials
3. Click "Create Lecture"
4. Fill in subject, date, and classroom coordinates
5. Share the QR code with students
6. View attendance in the dashboard

### For Students
1. Scan the QR code with your phone camera
2. Allow location access when prompted
3. Enter your name and roll number
4. Submit to mark attendance

## 🌐 Deployment

### Free Hosting Options
- [Render.com](https://render.com) - Free tier for Node.js apps
- [Railway.app](https://railway.app) - Simple deployment
- [Glitch.com](https://glitch.com) - Quick demos

### Deploy Steps
1. Push code to GitHub
2. Connect repository to hosting platform
3. Set start command: `npm start`
4. Set environment port if needed

## 📁 Project Structure

```
├── server.js              # Express server
├── package.json           # Dependencies
├── database/
│   └── init.js            # JSON database
├── routes/
│   ├── auth.js            # Authentication
│   ├── lectures.js        # Lecture CRUD
│   └── attendance.js      # Mark attendance
├── middleware/
│   └── auth.js            # JWT verification
├── utils/
│   └── location.js        # GPS calculations
└── public/
    ├── index.html         # Landing page
    ├── css/styles.css     # Styles
    ├── js/                # Frontend logic
    ├── teacher/           # Teacher pages
    └── student/           # Student pages
```

## 📝 License

MIT License - feel free to use for educational purposes!

## 🙏 Contributing

Pull requests are welcome. For major changes, please open an issue first.
