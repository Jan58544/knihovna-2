// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor, act, screen, fireEvent } from '@testing-library/react';
import ScannerModal from './ScannerModal';

const camera = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), clear: vi.fn(), constructor: vi.fn() }));
vi.mock('html5-qrcode', () => ({
  Html5QrcodeSupportedFormats: { EAN_13: 9, CODE_128: 14 },
  Html5Qrcode: class {
    constructor(...args) { camera.constructor(...args); }
    isScanning = true;
    start = camera.start;
    stop = camera.stop;
    clear = camera.clear;
  },
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('camera scanner', () => {
  it('restricts decoding, rejects altered codes, confirms a repeated ISBN, and ignores further callbacks', async () => {
    const success = vi.fn();
    const close = vi.fn();
    const candidate = vi.fn();
    render(<ScannerModal isOpen onClose={close} onScanSuccess={success} onScanCandidate={candidate} />);
    await waitFor(() => expect(camera.start).toHaveBeenCalledTimes(1));
    expect(camera.constructor).toHaveBeenCalledWith('reader', expect.objectContaining({ formatsToSupport: [9, 14], useBarCodeDetectorIfSupported: true }));
    const [selection, config, decode] = camera.start.mock.calls[0];
    // Exercise the installed library's real selector validation, not just the mock.
    const { Html5Qrcode } = await vi.importActual('html5-qrcode');
    expect(Html5Qrcode.prototype.createVideoConstraints.call({}, selection)).toEqual({ facingMode: 'environment' });
    expect(config.videoConstraints).toEqual({
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 },
    });
    expect(config.fps).toBe(30);
    expect(config.qrbox(240, 200)).toEqual({ width: 216, height: 130 });
    act(() => { decode('9788O25703670'); decode('9788025703671'); decode('9788025703670'); });
    expect(success).not.toHaveBeenCalled();
    expect(candidate).toHaveBeenCalledExactlyOnceWith('9788025703670');
    // A second camera frame, rather than a second result within the same instant.
    await new Promise(resolve => setTimeout(resolve, 45));
    act(() => { decode('9788025703670'); decode('9788025703670'); });
    expect(success).toHaveBeenCalledExactlyOnceWith('9788025703670');
    expect(close).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(camera.stop).toHaveBeenCalled());
  });
  it('explains denied permissions and allows retrying the camera', async () => {
    camera.start.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'));
    render(<ScannerModal isOpen onClose={vi.fn()} onScanSuccess={vi.fn()} />);
    expect(await screen.findByText(/Přístup ke kameře je zakázaný/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Zkusit kameru znovu' }));
    await waitFor(() => expect(camera.start).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/Přístup ke kameře je zakázaný/)).toBeNull());
  });

});
