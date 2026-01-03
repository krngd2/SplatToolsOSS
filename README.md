# SplatToolsOSS

SplatToolsOSS is an open-source toolkit designed to streamline the data preparation process for **3D Gaussian Splatting**. It provides tools for video frame extraction, interactive 360-degree editing, and AI-powered mask generation—all accessible directly in your browser.

## 🌐 Live Demo

You can use SplatTools without any setup at **[splat.tools](http://splat.tools)**. 

The live version includes a **Premium AI Masking** feature for even higher quality 3D reconstructions.

## 🚀 Key Features

### 1. Sharp Frame Extraction
- **Blur Detection**: Automatically identify and extract the sharpest frames from your videos.
- **HDR Support**: Full support for HDR video and 10-bit color for cinema-quality stills.
- **Precision Control**: Navigate timelines and extract exactly what you need with high accuracy.

### 2. 360° Editor (Beta)
- **Rectilinear Extraction**: Convert 360-degree equirectangular footage into standard rectilinear frames.
- **Interactive Preview**: Real-time 3D preview of your 360 footage.
- **Timeline Integration**: Easily manage and process spherical video data.

### 3. Mask Generation (Premium Feature)
- **AI-Powered Segmentation**: Generate precise masks for your images using advanced AI models.
- **Gaussian Splatting Optimization**: Specifically designed to improve the quality of 3D reconstructions by masking out unwanted elements.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/)
- **Frontend**: React 19, Tailwind CSS
- **3D Rendering**: [Three.js](https://threejs.org/) & [React Three Fiber](https://r3f.docs.pmnd.rs/)
- **Image Processing**: Sharp, HDR-Canvas
- **Icons**: Lucide React
- **UI Components**: Radix UI & Shadcn/UI

## 🚦 Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/splat-tools-oss.git
   cd splat-tools-oss
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the results.

## 📄 License

This project is licensed under the **GNU Lesser General Public License v3.0 (LGPL-3.0)**. 

- See [LICENSE](LICENSE) for the full GPLv3 text.
- See [LICENSE.LESSER](LICENSE.LESSER) for the LGPLv3 additional permissions.

---
Built with ❤️ for the 3D Gaussian Splatting community.
