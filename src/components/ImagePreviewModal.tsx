import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Download, ExternalLink, ZoomIn, ZoomOut, RotateCcw, RotateCw } from 'lucide-react';
import { ImageRecord } from '../types';

interface ImagePreviewModalProps {
  image: ImageRecord | null;
  onClose: () => void;
  onDelete: (image: ImageRecord) => void;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0; // Strict maximum zoom limit to prevent GPU texture context loss/blackout

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  image,
  onClose,
  onDelete,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgError, setImgError] = useState<boolean>(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);

  // Reset zoom & rotation when a new image is opened
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImgError(false);
  }, [image]);

  if (!image) return null;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, MIN_SCALE);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = image.downloadUrl;
    a.download = image.fileName || `receipt_${image.uploadDate}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Mouse wheel zoom support with strict MAX_SCALE clamping
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta));
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Drag / Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan & pinch zoom support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Multitouch pinch zoom initialization
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchDistanceRef.current = dist;
      initialPinchScaleRef.current = scale;
      setIsDragging(false);
    } else if (e.touches.length === 1 && scale > 1) {
      // Single touch pan initialization
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistanceRef.current !== null) {
      // Process pinch zoom
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (pinchDistanceRef.current > 0) {
        const factor = currentDist / pinchDistanceRef.current;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialPinchScaleRef.current * factor));
        setScale(newScale);
        if (newScale <= 1) setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Process single finger pan
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    pinchDistanceRef.current = null;
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0E1116]/95 backdrop-blur-md flex flex-col justify-between p-2 sm:p-4 select-none">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between bg-[#1A1C1E]/90 border border-white/10 rounded-2xl p-3 shadow-lg z-10">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-xs bg-[#D0E4FF]/10 text-[#D0E4FF] font-bold px-2.5 py-1 rounded-lg border border-[#D0E4FF]/20 flex-shrink-0">
            📁 {image.folderName}
          </span>
          <span className="text-xs font-mono text-gray-300 truncate hidden sm:inline">
            {image.fileName || 'Receipt Photo'}
          </span>
        </div>

        {/* Zoom & Rotate Toolbar */}
        <div className="flex items-center space-x-1 sm:space-x-2 bg-[#0E1116] border border-white/5 rounded-xl px-2 py-1">
          <button
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            disabled={scale <= MIN_SCALE}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition disabled:opacity-30"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-[#D0E4FF] font-bold px-1 min-w-[45px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            title="Zoom In (+)"
            disabled={scale >= MAX_SCALE}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition disabled:opacity-30"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          <button
            onClick={handleRotate}
            title="Rotate 90°"
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetZoom}
            title="Reset View"
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition border border-red-500/30 ml-2"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Interactive Zoom / Canvas Viewing Area */}
      <div
        className="flex-1 my-2 relative overflow-hidden rounded-2xl bg-[#08090C] border border-white/5 flex items-center justify-center cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={() => (scale > 1 ? handleResetZoom() : setScale(2))}
      >
        <div
          className="transition-transform duration-75 ease-out flex items-center justify-center pointer-events-none"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale}) rotate(${rotation}deg)`,
            willChange: 'transform',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {imgError ? (
            <div className="p-8 text-center text-gray-400 space-y-2 bg-[#1A1C1E] rounded-xl border border-white/10 pointer-events-auto">
              <p className="text-sm font-semibold text-red-400">Unable to render image preview</p>
              <p className="text-xs text-gray-500">The photo URL or data may be corrupted or unavailable.</p>
            </div>
          ) : (
            <img
              ref={imageRef}
              src={image.downloadUrl}
              alt={image.fileName || 'Receipt Detail'}
              onError={() => setImgError(true)}
              className="max-h-[72vh] max-w-full object-contain pointer-events-none rounded-lg shadow-2xl"
              style={{
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
              }}
            />
          )}
        </div>

        {scale > 1 && (
          <div className="absolute bottom-3 left-3 bg-[#1A1C1E]/80 backdrop-blur text-xs text-gray-300 px-3 py-1 rounded-full border border-white/10 pointer-events-none">
            Pinch/Drag to Pan • Double-click to Reset
          </div>
        )}
      </div>

      {/* Bottom Bar Details & Action Buttons */}
      <div className="bg-[#1A1C1E]/90 border border-white/10 rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
        <div className="flex items-center space-x-4 text-xs">
          <div>
            <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Date</span>
            <span className="font-mono text-[#E2E2E6] font-semibold">
              {image.formattedDate || new Date(image.uploadDate).toLocaleDateString()}
            </span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div>
            <span className="text-[10px] text-[#D0E4FF] block uppercase font-bold tracking-wider">Size</span>
            <span className="font-mono text-[#D0E4FF] font-bold">
              {image.compressedSizeKb ? `${image.compressedSizeKb} KB` : 'Compressed'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 w-full sm:w-auto">
          <button
            onClick={() => {
              onDelete(image);
              onClose();
            }}
            className="flex-1 sm:flex-none py-2 px-3 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 sm:flex-none py-2 px-3 bg-[#2D2F31] hover:bg-white/10 text-[#E2E2E6] font-semibold text-xs rounded-xl border border-white/5 transition flex items-center justify-center space-x-1"
          >
            <Download className="w-3.5 h-3.5 text-[#D0E4FF]" />
            <span>Save</span>
          </button>

          <a
            href={image.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none py-2 px-3 bg-[#D0E4FF] hover:bg-white text-[#00315B] font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Original</span>
          </a>
        </div>
      </div>
    </div>
  );
};

