import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Keyboard, Search, AlertCircle } from 'lucide-react';
import { cleanIsbn, isValidIsbn, attemptOcrCorrection } from '../utils/isbnUtils';

export default function ScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [mode, setMode] = useState('camera'); // 'camera' or 'manual'
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [manualError, setManualError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const scannerRef = useRef(null);
  const isScannedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || mode !== 'camera') {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          try {
            scannerRef.current.clear();
          } catch (e) {}
          scannerRef.current = null;
        });
      }
      return;
    }

    isScannedRef.current = false;
    setIsInitializing(true);
    setCameraError(null);

    const regionId = 'reader';
    let html5Qrcode = null;

    const startScanner = async () => {
      try {
        const element = document.getElementById(regionId);
        if (!element) {
          setIsInitializing(false);
          return;
        }

        html5Qrcode = new Html5Qrcode(regionId);
        scannerRef.current = html5Qrcode;

        const config = {
          fps: 10,
          qrbox: { width: 260, height: 180 },
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

            const cleaned = cleanIsbn(decodedText);
            const valid = isValidIsbn(cleaned) || attemptOcrCorrection(decodedText);
            const valueToSend = valid || decodedText;

            if (scannerRef.current && scannerRef.current.isScanning) {
              scannerRef.current
                .stop()
                .catch(() => {})
                .then(() => {
                  try {
                    scannerRef.current?.clear();
                  } catch (e) {}
                })
                .finally(() => {
                  onScanSuccess(valueToSend);
                  onClose();
                });
            } else {
              onScanSuccess(valueToSend);
              onClose();
            }
          },
          () => {}
        );
        setIsInitializing(false);
      } catch (err) {
        console.error('Camera initialization error:', err);
        setCameraError('Unable to access camera. Please allow camera permissions or enter ISBN manually.');
        setIsInitializing(false);
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {}).then(() => {
          try {
            scannerRef.current?.clear();
          } catch (e) {}
          scannerRef.current = null;
        });
      }
    };
  }, [isOpen, mode, onClose, onScanSuccess]);

  const handleClose = () => {
    setManualInput('');
    setCameraError(null);
    setManualError(null);
    setMode('camera');
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setManualError(null);
    const trimmed = manualInput.trim();
    if (!trimmed) {
      setManualError('Please enter an ISBN or book title.');
      return;
    }

    const cleaned = cleanIsbn(trimmed);
    const isPureCode = /^[0-9X\- ]+$/i.test(trimmed);

    if (isPureCode) {
      if (!isValidIsbn(cleaned) && !attemptOcrCorrection(trimmed)) {
        setManualError('Invalid ISBN checksum or length. Please check the code or search by title.');
        return;
      }
    }

    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }

    onScanSuccess(trimmed);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-black rounded-2xl overflow-hidden shadow-2xl border border-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setManualError(null);
                setMode('camera');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'camera'
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                setManualError(null);
                setMode('manual');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'manual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        {mode === 'camera' ? (
          <div className="relative min-h-[300px] bg-black flex flex-col items-center justify-center">
            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 gap-2 z-10 bg-black">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm font-medium">Starting camera...</p>
              </div>
            )}

            {cameraError ? (
              <div className="p-6 text-center text-red-400 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
                <p className="font-semibold mb-2">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg text-xs hover:bg-indigo-500 transition-colors"
                >
                  Enter ISBN Manually
                </button>
              </div>
            ) : (
              <div id="reader" className="w-full overflow-hidden"></div>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="p-6 bg-neutral-950 flex flex-col gap-4">
            <div>
              <label htmlFor="isbnInput" className="block text-xs font-medium text-neutral-300 mb-1.5">
                ISBN or Book Title / Author
              </label>
              <input
                id="isbnInput"
                type="text"
                placeholder="e.g. 978-80-12345-67-8 or 0306406152"
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  if (manualError) setManualError(null);
                }}
                autoFocus
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-neutral-500"
              />
              {manualError ? (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{manualError}</span>
                </p>
              ) : (
                <p className="text-[11px] text-neutral-500 mt-1">
                  Supports ISBN-10, ISBN-13 (with or without hyphens) or book title.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>Search Book</span>
            </button>
          </form>
        )}

        {/* Footer Hint */}
        <div className="px-4 py-3 bg-neutral-900 border-t border-neutral-800 text-center text-xs text-neutral-400">
          {mode === 'camera'
            ? "Position the book's ISBN barcode inside the box"
            : "Enter an ISBN or title to look up book details"}
        </div>
      </div>
    </div>
  );
}
