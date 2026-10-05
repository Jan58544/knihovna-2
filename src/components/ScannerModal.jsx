import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw } from 'lucide-react';

export default function ScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef(null);
  const isScannedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    isScannedRef.current = false;
    setIsInitializing(true);
    setErrorMsg(null);

    const regionId = 'reader';
    let html5Qrcode = null;

    const startScanner = async () => {
      try {
        html5Qrcode = new Html5Qrcode(regionId);
        scannerRef.current = html5Qrcode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 180 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
          ],
        };

        await html5Qrcode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isScannedRef.current) return;
            isScannedRef.current = true;

            // Stop scanner and invoke callback
            if (scannerRef.current) {
              scannerRef.current
                .stop()
                .catch(() => {})
                .finally(() => {
                  onScanSuccess(decodedText);
                  onClose();
                });
            } else {
              onScanSuccess(decodedText);
              onClose();
            }
          },
          () => {
            // Frame scan failure callback (ignored for normal operation)
          }
        );
        setIsInitializing(false);
      } catch (err) {
        console.error('Camera initialization error:', err);
        setErrorMsg('Unable to access camera. Please allow camera permissions.');
        setIsInitializing(false);
      }
    };

    // Small delay to ensure modal DOM container is mounted
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((e) => console.error('Error stopping scanner:', e));
      }
    };
  }, [isOpen, onClose, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Camera className="w-5 h-5 text-indigo-400" />
            <span>Scan ISBN Barcode</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scanner Container */}
        <div className="relative min-h-[300px] bg-black flex flex-col items-center justify-center">
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 gap-2 z-10 bg-black">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Starting camera...</p>
            </div>
          )}

          {errorMsg ? (
            <div className="p-6 text-center text-red-400 text-sm">
              <p className="font-semibold mb-2">{errorMsg}</p>
              <p className="text-xs text-neutral-400">Make sure your browser has camera access permissions enabled.</p>
            </div>
          ) : (
            <div id="reader" className="w-full overflow-hidden"></div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-3 bg-neutral-900 border-t border-neutral-800 text-center text-xs text-neutral-400">
          Position the book's ISBN barcode inside the box
        </div>
      </div>
    </div>
  );
}
