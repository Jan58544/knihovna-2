// The normal scanner stays fast; only difficult codes use this higher-resolution pass.
export function startRobustScanner(container, onDecode) {
  let cancelled = false;
  let timer;
  let reader;
  const canvas = document.createElement('canvas');
  const tick = async () => {
    try {
      const video = container.querySelector('video');
      if (video?.readyState >= 2 && video.videoWidth && video.videoHeight) {
        if (!reader) {
          const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } = await import('@zxing/library');
          if (cancelled) return;
          reader = new BrowserMultiFormatReader(new Map([
            [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.CODE_128]],
            [DecodeHintType.TRY_HARDER, true],
          ]));
        }
        // Keep the camera's detail, rather than the 300–420px preview resolution.
        const scale = Math.min(1, 1600 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const result = reader.decodeFromCanvas(canvas);
        if (!cancelled) onDecode(result.getText());
      }
    } catch {
      // No barcode in this frame, or an optional decoder unavailable: keep the fast path running.
    } finally {
      if (!cancelled) timer = setTimeout(tick, 250);
    }
  };
  timer = setTimeout(tick, 750);
  return () => { cancelled = true; clearTimeout(timer); };
}
