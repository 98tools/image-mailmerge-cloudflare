
# Image Mail Merge

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abdulkarim1422/image-mailmerge-cloudflare)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

A powerful, web-based image mail merge tool that allows you to create personalized images by combining templates with CSV data. Built with React and TypeScript, optimized for easy and fast deployment on **Cloudflare Workers**.

## Screenshots
<img width="1898" height="890" alt="image" src="https://github.com/user-attachments/assets/189129e4-7473-4849-b3c8-539fa9bf5031" />
<img width="1907" height="900" alt="image" src="https://github.com/user-attachments/assets/810e89e0-8c6b-4af0-8f0a-4231e038beb0" />
<img width="597" height="64" alt="image" src="https://github.com/user-attachments/assets/62036143-fe2f-47e3-ba47-9a8c94602841" />
<img width="1550" height="892" alt="image" src="https://github.com/user-attachments/assets/176b514b-6476-465e-95a6-cff98133f47e" />


## ✨ Features

- 🎨 **Drag & Drop Interface** - Easy-to-use interface for uploading images and CSV files
- 📊 **CSV Data Integration** - Import data from CSV files for batch processing
- 🎯 **Visual Field Positioning** - Click to add, drag to move, scroll to resize text and QR codes
- 🎭 **Rich Text Styling** - Multiple fonts, colors, text alignment, and markdown formatting
- 🔤 **Automatic Font Detection** - Discovers all system fonts automatically (200+ fonts typically)
- 📱 **QR Code Support** - Add dynamic QR codes with data from CSV columns
- 🔍 **Zoom & Pan Controls** - Navigate large images with precision
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🚀 **Cloudflare Workers Ready** - Optimized for edge deployment
- 📦 **Batch Export** - Download all generated images as a ZIP file with custom naming
- 🔄 **Real-time Preview** - See changes instantly as you customize
- ⌨️ **Keyboard Shortcuts** - Zoom in/out with Ctrl+/Ctrl- and fit with Ctrl+0

## 🚀 Quick Start

### One-Click Deploy

Deploy directly to Cloudflare Workers with one click:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abdulkarim1422/image-mailmerge-cloudflare)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/abdulkarim1422/image-mailmerge-cloudflare.git
   cd image-mailmerge-cloudflare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **File Processing**: JSZip, PapaParse
- **Font Detection**: Font Access API + Canvas-based fallback
- **Deployment**: Cloudflare Workers
- **Development**: Hot reload, TypeScript support

## 📖 How to Use

1. **Upload Background Image**
   - Click "Choose Image" or drag and drop an image file
   - Supported formats: JPG, PNG, GIF, WebP
   - Use zoom controls and middle-click to pan around large images

2. **Upload CSV Data**
   - Click "Choose CSV File" or drag and drop a CSV file
   - First row should contain column headers
   - Data will be used to populate text fields and QR codes

3. **Add Fields**
   - Click anywhere on the image to add a new field
   - Choose between **Text Field** or **QR Code Field**
   - Enter a descriptive name for the field

4. **Customize Fields**
   - **Drag** fields to reposition them
   - **Scroll** over fields to resize font/QR code size
   - For text: Choose font, color, alignment, and add demo text
   - For QR codes: Set size, colors, and demo data
   - Use **markdown formatting** in text (bold: `**text**`, italic: `*text*`)

5. **Map CSV Columns**
   - Use dropdown menus to map CSV columns to your fields
   - Use preview navigation to see how different rows will look
   - Set up file naming using CSV columns and/or numbering

6. **Generate Images**
   - Click "Generate All Images" to create personalized versions
   - Download as a ZIP file with your custom naming scheme

## 🎯 Use Cases

- **Event Invitations** - Create personalized invitations with guest names and QR codes for RSVP
- **Certificates** - Generate certificates with recipient details and verification QR codes
- **Conference Badges** - Create name badges with attendee info and session QR codes
- **Marketing Materials** - Customize promotional images with customer data and tracking codes
- **Event Tickets** - Generate tickets with unique QR codes for entry validation
- **Product Labels** - Create labels with product info and QR codes for inventory tracking
- **Social Media Content** - Bulk create personalized social media posts with engagement tracking
- **ID Cards** - Generate employee or student IDs with photos and access QR codes


## 🚀 Deployment

### Method 1: Deploy to Cloudflare Workers with one click
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abdulkarim1422/image-mailmerge-cloudflare)

### Method 2: Deploy to Cloudflare Workers manually

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Build and Deploy**
   ```bash
   npm run build
   npm run deploy
   ```

### Deploy to Other Platforms

The built application (`dist/` folder) can be deployed to any static hosting service:

- **Netlify**: Drag and drop the `dist` folder
- **GitHub Pages**: Use the built files from `dist/`

## 📜 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to Cloudflare Workers

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📋 Roadmap

- [x] **Enhanced Font Support**
  - [x] Automatic system font detection (200+ fonts)
  - [x] Font search and filtering
  - [x] Cross-platform font compatibility
  - [ ] Font preview before selection
  - [ ] Google Fonts API integration
  - [ ] Custom font upload

- [x] **QR Code Integration**
  - [x] Dynamic QR code generation from CSV data
  - [x] Customizable QR code size and colors
  - [x] Visual QR code positioning

- [ ] **Email Integration**
  - [ ] SMTP support for email delivery
  - [ ] Email template customization
  - [ ] Bulk email sending

- [ ] **Advanced Features**
  - [ ] Undo/Redo functionality
  - [ ] Image filters and effects
  - [ ] Multiple image formats export
  - [ ] Batch processing optimization

- [ ] **User Experience**
  - [ ] Keyboard shortcuts
  - [ ] Dark mode support
  - [ ] Multi-language support

## 🐛 Bug Reports & Feature Requests

Found a bug or have a feature request? Please create an issue on [GitHub Issues](https://github.com/abdulkarim1422/image-mailmerge-cloudflare/issues).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com/)
- File processing by [JSZip](https://stuk.github.io/jszip/) and [PapaParse](https://www.papaparse.com/)
- Font detection using [Font Access API](https://developer.mozilla.org/en-US/docs/Web/API/Local_Font_Access_API) and Canvas fallbacks

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/abdulkarim1422">Abdulkarim Lahmuni</a></p>
  <p>
    <a href="https://github.com/abdulkarim1422/image-mailmerge-cloudflare/stargazers">⭐ Star this project</a> •
    <a href="https://github.com/abdulkarim1422/image-mailmerge-cloudflare/issues">🐛 Report Bug</a> •
    <a href="https://github.com/abdulkarim1422/image-mailmerge-cloudflare/pulls">🔧 Request Feature</a>
  </p>
</div>
