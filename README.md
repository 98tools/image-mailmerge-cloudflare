
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
- 🎯 **Text Positioning** - Precise text placement with visual positioning controls
- 🎭 **Rich Text Styling** - Multiple fonts, colors, and text effects
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🚀 **Cloudflare Workers Ready** - Optimized for edge deployment
- 📦 **Batch Export** - Download all generated images as a ZIP file
- 🔄 **Real-time Preview** - See changes instantly as you customize

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
- **Deployment**: Cloudflare Workers
- **Development**: Hot reload, TypeScript support

## 📖 How to Use

1. **Upload Background Image**
   - Click "Choose Image" or drag and drop an image file
   - Supported formats: JPG, PNG, GIF, WebP

2. **Upload CSV Data**
   - Click "Choose CSV File" or drag and drop a CSV file
   - First row should contain column headers
   - Data will be used to populate text fields

3. **Add Text Elements**
   - Click "Add Text Element" to create customizable text
   - Use the visual editor to position text precisely
   - Customize font, size, color, and effects

4. **Map CSV Columns**
   - Use dropdown menus to map CSV columns to text elements
   - Preview shows how data will appear on each image

5. **Generate Images**
   - Click "Generate All Images" to create personalized versions
   - Download individual images or all as a ZIP file

## 🎯 Use Cases

- **Event Invitations** - Create personalized invitations with guest names
- **Certificates** - Generate certificates with recipient details
- **Marketing Materials** - Customize promotional images with customer data
- **Badge Generation** - Create name badges for conferences or events
- **Social Media Content** - Bulk create personalized social media posts


## 🚀 Deployment

### Deploy to Cloudflare Workers

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

- [ ] **Enhanced Font Support**
  - [ ] Font preview before selection
  - [ ] Fonts for different languages ~Arabic
  - [ ] Google Fonts API integration
  - [ ] Custom font upload
  - [ ] Font weight and style options

- [ ] **Email Integration**
  - [ ] SMTP support for email delivery
  - [ ] Email template customization
  - [ ] Bulk email sending

- [ ] **Advanced Features**
  - [ ] Image filters and effects
  - [ ] Multiple image formats export
  - [ ] Batch processing optimization
  - [ ] Template library

- [ ] **User Experience**
  - [ ] Undo/Redo functionality
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

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/abdulkarim1422">Abdulkarim Lahmuni</a></p>
  <p>
    <a href="https://github.com/abdulkarim1422/image-mailmerge-cloudflare/stargazers">⭐ Star this project</a> •
    <a href="https://github.com/abdulkarim1422/image-mailmerge-cloudflare/issues">🐛 Report Bug</a> •
    <a href="https://github.com/abdulkarim1422/image-mailmerge-cloudflare/pulls">🔧 Request Feature</a>
  </p>
</div>
