/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, RefreshCw, CheckCircle2, AlertCircle, Loader2, Cpu, Trash2, ShieldCheck, Zap, MessageCircle, Heart, Settings, Languages, LogOut, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

interface ScanRegion {
  box_2d: [number, number, number, number];
  text: string;
  translation: string;
}

interface ScanResult {
  originalText: string;
  translatedText: string;
  description?: string;
  regions?: ScanRegion[];
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [webAppUrl, setWebAppUrl] = useState<string>(
    localStorage.getItem('webAppUrl') || process.env.VITE_WEB_APP_URL || ''
  );
  const [showSettings, setShowSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scan when image changes
  useEffect(() => {
    if (image && !isScanning && !result) {
      scanAndTranslate(image);
    }
  }, [image]);

  // Start Camera
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setError(null);
      setResult(null);
      setImage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("SYSTEM_ERROR: CAMERA_ACCESS_DENIED");
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Capture Photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
      }
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImage(dataUrl);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Copy result to clipboard
  const copyToClipboard = () => {
    if (result) {
      const promoText = "Scan & Translate Kilat! Ubah tulisan asing jadi Bahasa Indonesia cuma sekali jepret. Cobain INDOSCAN_PRO sekarang! 🚀\n\n";
      const appLink = "Link: https://translate-lake-nine.vercel.app/\n";
      const logoLink = "Logo: https://josanvin.github.io/josanvin/img/indoscan.png\n\n";
      const text = `${promoText}${appLink}${logoLink}Original: ${result.originalText}\n\nTranslation: ${result.translatedText}`;
      
      navigator.clipboard.writeText(text);
      // Simple feedback
      const btn = document.getElementById('copy-btn');
      if (btn) {
        const originalText = btn.innerText;
        btn.innerText = 'COPIED!';
        setTimeout(() => btn.innerText = originalText, 2000);
      }
    }
  };

  // Download Translated Image
  const downloadImage = async () => {
    if (!imageContainerRef.current || !result) return;
    
    try {
      setIsDownloading(true);
      // Hide the scan line if it's there
      const canvas = await html2canvas(imageContainerRef.current, {
        useCORS: true,
        scale: 2, // Higher quality
        backgroundColor: null,
      });
      
      const link = document.createElement('a');
      link.download = `IndoScan_${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      setError('Gagal mengunduh gambar. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Reset App
  const resetApp = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setIsScanning(false);
    stopCamera();
  };

  // Scan and Translate with Google Apps Script Bridge
  const scanAndTranslate = async (imageData: string) => {
    if (!webAppUrl) {
      setError("Silakan atur URL Web App (Apps Script) di pengaturan (ikon gear) terlebih dahulu.");
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify({
          action: 'scanIndo',
          image: imageData
        })
      });

      const resultData = await response.json();

      if (resultData.status === 'success') {
        setResult(resultData.data);
      } else {
        throw new Error(resultData.message || "Gagal memproses gambar melalui jembatan.");
      }
    } catch (err: any) {
      console.error("Scan error details:", err);
      setError(`PROCESS_FAILED: ${err.message || "RETRY_REQUIRED"}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen techno-grid font-mono selection:bg-emerald-500/30">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-md mx-auto min-h-screen flex flex-col p-4 md:p-6">
        {/* Header */}
        <header className="mb-8 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/70 font-bold">System Online</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 hover:bg-white/5 rounded transition-colors"
                title="Settings"
              >
                <Settings className="w-3 h-3 text-stone-500" />
              </button>
              <span className="text-[10px] text-stone-500">v2.5.0-FLASH</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg overflow-hidden">
              <img 
                src="https://josanvin.github.io/josanvin/img/indoscan.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-tighter glow-text">INDOSCAN_PRO</h1>
              <p className="text-[10px] text-stone-500 uppercase tracking-widest">Neural Translation Interface</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl">
            <p className="text-[11px] text-emerald-400 font-bold leading-relaxed">
              "Scan & Translate Kilat! Ubah tulisan asing jadi Bahasa Indonesia cuma sekali jepret. Gak pake ribet, langsung paham! 🚀"
            </p>
          </div>
        </header>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="glass-panel rounded-xl overflow-hidden mb-6"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                    Bridge Configuration (GAS)
                  </label>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={webAppUrl}
                    onChange={(e) => {
                      setWebAppUrl(e.target.value);
                      localStorage.setItem('webAppUrl', e.target.value);
                    }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-emerald-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="bg-emerald-500 text-black px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                  >
                    Save
                  </button>
                </div>
                <p className="text-[8px] text-stone-500 italic">
                  * Enter your Apps Script Web App URL to enable secure scanning via Spreadsheet bridge.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={startCamera}
              disabled={isScanning}
              className="glass-panel group flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              <Camera className="w-5 h-5 mb-2 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] uppercase tracking-wider font-bold">Capture</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="glass-panel group flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-5 h-5 mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] uppercase tracking-wider font-bold">Upload</span>
            </button>
            <button
              onClick={resetApp}
              className="glass-panel group flex flex-col items-center justify-center p-4 rounded-xl transition-all active:scale-95"
            >
              <Trash2 className="w-5 h-5 mb-2 text-red-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] uppercase tracking-wider font-bold">Reset</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Viewport */}
          <div className="relative">
            {/* Control Bar for Result */}
            {result && (
              <div className="absolute -top-12 left-0 right-0 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Show original</span>
                  <button 
                    onClick={() => setShowOriginal(!showOriginal)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${showOriginal ? 'bg-emerald-500' : 'bg-stone-700'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showOriginal ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    id="copy-btn"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-1 bg-stone-800 border border-white/10 rounded-lg text-[10px] font-bold text-stone-300 hover:bg-stone-700 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    COPY
                  </button>
                  <button 
                    onClick={downloadImage}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 border border-emerald-500/20 rounded-lg text-[10px] font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                    SAVE
                  </button>
                </div>
              </div>
            )}

            {/* Corner Accents */}
            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-500/50" />
            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-500/50" />
            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-500/50" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-500/50" />

            <div className="glass-panel rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                {isCameraActive ? (
                  <motion.div
                    key="camera"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full aspect-square relative"
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover grayscale-[0.5] contrast-125"
                    />
                    <div className="absolute inset-0 border-2 border-emerald-500/20 pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-emerald-500/30 rounded-full animate-pulse pointer-events-none" />
                    
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                      <button
                        onClick={capturePhoto}
                        className="p-4 bg-emerald-500 text-black rounded-full shadow-[0_0_20px_rgba(0,255,157,0.5)] hover:scale-105 transition-transform"
                      >
                        <Zap className="w-6 h-6 fill-current" />
                      </button>
                      <button
                        onClick={stopCamera}
                        className="p-4 bg-white/10 backdrop-blur-md text-white rounded-full hover:bg-white/20 transition-colors"
                      >
                        <RefreshCw className="w-6 h-6" />
                      </button>
                    </div>
                  </motion.div>
                ) : image ? (
                  <motion.div
                    key="image"
                    ref={imageContainerRef}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full relative"
                  >
                    <img src={image} alt="Preview" className={`w-full h-auto block transition-opacity ${isScanning ? 'opacity-50' : 'opacity-100'}`} />
                    
                    {/* Overlay Regions */}
                    {!showOriginal && result?.regions && result.regions.map((region, idx) => (
                      <div 
                        key={idx}
                        className="absolute bg-white/90 text-black px-1 py-0.5 rounded shadow-sm flex items-center justify-center text-center overflow-hidden leading-tight border border-black/10"
                        style={{
                          top: `${region.box_2d[0] / 10}%`,
                          left: `${region.box_2d[1] / 10}%`,
                          width: `${(region.box_2d[3] - region.box_2d[1]) / 10}%`,
                          height: `${(region.box_2d[2] - region.box_2d[0]) / 10}%`,
                          fontSize: 'min(2.5vw, 12px)',
                          fontWeight: '700',
                          zIndex: 5
                        }}
                      >
                        {region.translation}
                      </div>
                    ))}

                    {isScanning && <div className="scan-line" />}
                    {isScanning && (
                      <div className="absolute inset-0 bg-emerald-500/10 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
                        <span className="text-[10px] uppercase tracking-[0.3em] font-bold animate-pulse">Analyzing_Data...</span>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-12 text-center"
                  >
                    <div className="w-16 h-16 border-2 border-dashed border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="w-8 h-8 text-emerald-500/30" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-stone-600">Awaiting_Input_Signal</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{error}</span>
            </motion.div>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && !isScanning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="glass-panel rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-emerald-500" />
                    <span className="text-[10px] uppercase tracking-widest font-bold">Processing_Complete</span>
                  </div>

                  <div className="space-y-6">
                    {result.originalText && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Source_Text</label>
                          <span className="text-[8px] text-stone-600">AUTO_DETECT</span>
                        </div>
                        <p className="text-stone-400 text-sm leading-relaxed border-l border-stone-800 pl-4">{result.originalText}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold">Translated_Output</label>
                        <span className="text-[8px] text-emerald-500/50">ID_LOCALE</span>
                      </div>
                      <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                        <p className="text-emerald-400 font-bold text-sm leading-relaxed">{result.translatedText}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-stone-800">
                      <label className="text-[9px] uppercase tracking-widest text-stone-500 font-bold">Daftar Terjemahan</label>
                      <p className="text-stone-500 italic text-xs leading-relaxed whitespace-pre-wrap">{result.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Hidden Canvas for Capturing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Footer */}
        <footer className="mt-12 text-center pb-12">
          {/* Donation Section */}
          <div className="glass-panel rounded-xl p-4 mb-8 border-dashed border-emerald-500/30">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-red-500 fill-red-500/20" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Support Mimin Kuy!</span>
            </div>
            <p className="text-[10px] text-stone-500 mb-4 leading-relaxed">
              Bantu mimin beli kopi biar makin semangat update sistemnya! <br/>
              Donasi via <span className="text-emerald-500 font-bold">SHOPEE - OVO - GOPAY - DANA</span>
            </p>
            <div className="bg-black/40 rounded-lg p-2 border border-white/5 inline-block">
              <span className="text-xs font-mono text-emerald-400 font-bold tracking-wider">0813-41-300-100</span>
            </div>
          </div>

          {/* WhatsApp Link */}
          <a 
            href="https://wa.me/6281341300100" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-full transition-all group mb-8"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Chat Mimin (WA)</span>
          </a>

          <div className="flex items-center justify-center gap-4 mb-4 opacity-20">
            <div className="h-[1px] w-8 bg-emerald-500" />
            <div className="w-1 h-1 bg-emerald-500 rounded-full" />
            <div className="h-[1px] w-8 bg-emerald-500" />
          </div>
          <p className="text-[9px] uppercase tracking-widest text-stone-600 font-bold">
            Copyright©2026, JOHAN (0813-41-300-100)
          </p>
        </footer>
      </div>
    </div>
  );
}
