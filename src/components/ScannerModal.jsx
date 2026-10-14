import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Keyboard, Search, AlertCircle } from 'lucide-react';
import { cleanIsbn, isValidIsbn, attemptOcrCorrection } from '../utils/isbnUtils';

export default function ScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  initialMode = 'camera',
  initialInput = '',
  initialShowCustomFields = false,
}) {
  const [mode, setMode] = useState(initialMode); // 'camera' or 'manual'
  const [manualInput, setManualInput] = useState(initialInput);
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [showCustomFields, setShowCustomFields] = useState(initialShowCustomFields);
  const [cameraError, setCameraError] = useState(null);
  const [manualError, setManualError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanStatusInfo, setScanStatusInfo] = useState(null);
  const scannerRef = useRef(null);
  const scannedLockRef = useRef(false);
  const lastScannedTimeRef = useRef(0);

  const prevIsOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setMode(initialMode || 'camera');
      setManualInput(initialInput || '');
      setShowCustomFields(initialShowCustomFields || false);
      setCameraError(null);
      setManualError(null);
      setManualTitle('');
      setManualAuthor('');
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialMode, initialInput, initialShowCustomFields]);

  const handleClose = useCallback(() => {
    setManualInput('');
    setManualTitle('');
    setManualAuthor('');
    setShowCustomFields(false);
    setCameraError(null);
    setManualError(null);
    setMode('camera');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || mode !== 'camera') {
      const activeScanner = scannerRef.current;
      if (activeScanner && activeScanner.isScanning) {
        console.log('[scan] Stopping active camera session on mode/modal close');
        activeScanner.stop().catch((err) => {
          console.warn('[scan] Error stopping scanner on mode change:', err);
        }).finally(() => {
          try {
            activeScanner.clear();
          } catch {
            /* ignore */
          }
          if (scannerRef.current === activeScanner) {
            scannerRef.current = null;
          }
        });
      }
      return;
    }

    scannedLockRef.current = false;
    setIsInitializing(true);
    setCameraError(null);
    setScanStatusInfo('Snímání...');

    const regionId = 'reader';

    const startScanner = async () => {
      try {
        console.log('[scan] Initializing camera scanner...');
        const element = document.getElementById(regionId);
        if (!element) {
          console.warn('[scan] Scanner DOM element #reader not found');
          setIsInitializing(false);
          return;
        }

        const html5Qrcode = new Html5Qrcode(regionId);
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
          (decodedText, result) => {
            const now = Date.now();
            if (scannedLockRef.current || (now - lastScannedTimeRef.current < 2000)) {
              console.log('[scan] Debouncing rapid scan event:', decodedText);
              return;
            }

            const formatName = result?.result?.format?.formatName || 'UNKNOWN';
            console.log(`[scan] Code detected: "${decodedText}", format: ${formatName}`);

            const cleaned = cleanIsbn(decodedText);
            let validIsbn = null;

            if (isValidIsbn(cleaned)) {
              validIsbn = cleaned;
            } else {
              const corrected = attemptOcrCorrection(decodedText);
              if (corrected && isValidIsbn(corrected)) {
                validIsbn = corrected;
              }
            }

            if (!validIsbn) {
              console.warn('[scan] Invalid ISBN scanned:', decodedText);
              setScanStatusInfo(`Neplatné ISBN: ${decodedText}`);
              setCameraError(`Naskenovaný kód "${decodedText}" není platné ISBN. Zkontrolujte kód nebo zadejte údaje ručně.`);
              return;
            }

            scannedLockRef.current = true;
            lastScannedTimeRef.current = now;

            console.log(`[scan] Normalized ISBN: ${cleaned || 'N/A'}, Recognized: ${validIsbn} (raw: ${decodedText})`);
            setScanStatusInfo(`Kód detekován: ${decodedText} | ISBN: ${validIsbn}`);

            const instance = scannerRef.current;
            if (instance && instance.isScanning) {
              instance
                .stop()
                .catch((err) => console.warn('[scan] Non-fatal scanner stop warning:', err))
                .finally(() => {
                  try {
                    instance.clear();
                  } catch {
                    /* ignore */
                  }
                  if (scannerRef.current === instance) {
                    scannerRef.current = null;
                  }
                });
            }

            onScanSuccess(validIsbn);
            handleClose();
          },
          () => {}
        );
        console.log('[scan] Camera scanner started successfully');
        setIsInitializing(false);
      } catch (err) {
        console.error('[scan] Camera initialization error:', err);
        setCameraError('Kamera není dostupná nebo přístup nebyl povolen. Zadejte prosím ISBN ručně.');
        setIsInitializing(false);
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      clearTimeout(timer);
      const activeScanner = scannerRef.current;
      if (activeScanner && activeScanner.isScanning) {
        console.log('[scan] Cleanup stopping camera scanner');
        activeScanner.stop().catch(() => {}).finally(() => {
          try {
            activeScanner.clear();
          } catch {
            /* ignore */
          }
          if (scannerRef.current === activeScanner) {
            scannerRef.current = null;
          }
        });
      }
    };
  }, [isOpen, mode, onClose, onScanSuccess, handleClose]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setManualError(null);
    const trimmed = manualInput.trim();

    if (showCustomFields || manualTitle.trim()) {
      if (!manualTitle.trim()) {
        setManualError('Zadejte prosím název knihy.');
        return;
      }
      const customBook = {
        id: `${cleanIsbn(trimmed) || 'MANUAL'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        isbn: cleanIsbn(trimmed) || trimmed || '',
        title: manualTitle.trim(),
        authors: manualAuthor.trim() || 'Neznámý autor',
        publisher: null,
        publishedDate: null,
        description: null,
        pageCount: null,
        coverUrl: null,
        scannedAt: new Date().toISOString(),
      };
      console.log('[scan] Adding manual book entry directly:', customBook);
      onScanSuccess(trimmed, customBook);
      handleClose();
      return;
    }

    if (!trimmed) {
      setManualError('Zadejte prosím ISBN nebo název knihy.');
      return;
    }

    const cleaned = cleanIsbn(trimmed);
    const isPureCode = /^[0-9X\- ]+$/i.test(trimmed);

    let valueToSend = trimmed;
    if (isPureCode) {
      if (isValidIsbn(cleaned)) {
        valueToSend = cleaned;
      } else {
        const corrected = attemptOcrCorrection(trimmed);
        if (corrected && isValidIsbn(corrected)) {
          valueToSend = corrected;
        } else {
          setManualError('Neplatné ISBN. Zkontrolujte kód nebo zvolte ruční zadání názvu níže.');
          setShowCustomFields(true);
          return;
        }
      }
    }

    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }

    onScanSuccess(valueToSend);
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
              <span>Kamera</span>
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
              <span>Ruční zadání</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Zavřít skener"
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
                <p className="text-sm font-medium">Spouštění kamery...</p>
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
                  Zadejte ISBN ručně
                </button>
              </div>
            ) : (
              <>
                <div id="reader" className="w-full overflow-hidden"></div>
                {scanStatusInfo && (
                  <div className="absolute bottom-2 left-2 right-2 bg-black/75 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono text-center border border-emerald-500/30">
                    {scanStatusInfo}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="p-6 bg-neutral-950 flex flex-col gap-4">
            <div>
              <label htmlFor="isbnInput" className="block text-xs font-medium text-neutral-300 mb-1.5">
                ISBN nebo název / autor knihy
              </label>
              <input
                id="isbnInput"
                type="text"
                placeholder="např. 978-80-12345-67-8 nebo Clean Code"
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  if (manualError) setManualError(null);
                }}
                autoFocus
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 placeholder-neutral-500"
              />
              {manualError && (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{manualError}</span>
                </p>
              )}
            </div>

            {showCustomFields ? (
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                <div>
                  <label htmlFor="manualTitleInput" className="block text-xs font-medium text-neutral-300 mb-1">
                    Název knihy *
                  </label>
                  <input
                    id="manualTitleInput"
                    type="text"
                    placeholder="Název knihy"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor="manualAuthorInput" className="block text-xs font-medium text-neutral-300 mb-1">
                    Autor
                  </label>
                  <input
                    id="manualAuthorInput"
                    type="text"
                    placeholder="Jméno autora"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCustomFields(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 text-left underline"
              >
                + Nebo přidejte název a autora ručně bez vyhledávání
              </button>
            )}

            <button
              type="submit"
              disabled={!manualInput.trim() && !manualTitle.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{showCustomFields || manualTitle.trim() ? 'Přidat knihu do knihovny' : 'Vyhledat knihu'}</span>
            </button>
          </form>
        )}

        {/* Footer Hint */}
        <div className="px-4 py-3 bg-neutral-900 border-t border-neutral-800 text-center text-xs text-neutral-400">
          {mode === 'camera'
            ? 'Naměřte čárový kód ISBN knihy do vyznačeného okna'
            : 'Zadejte ISBN nebo název pro vyhledání knihy'}
        </div>
      </div>
    </div>
  );
}
