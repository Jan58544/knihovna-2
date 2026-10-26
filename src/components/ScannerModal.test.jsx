// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor, act } from '@testing-library/react';
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
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('camera scanner', () => {
  it('restricts decoding, rejects altered codes, confirms a repeated ISBN, and ignores further callbacks', async () => {
    const success = vi.fn();
    const close = vi.fn();
    render(<ScannerModal isOpen onClose={close} onScanSuccess={success} />);
    await waitFor(() => expect(camera.start).toHaveBeenCalledTimes(1));
    expect(camera.constructor).toHaveBeenCalledWith('reader', expect.objectContaining({ formatsToSupport: [9, 14], useBarCodeDetectorIfSupported: true }));
    const [, config, decode] = camera.start.mock.calls[0];
    expect(config.fps).toBe(24);
    expect(config.qrbox(240, 200)).toEqual({ width: 216, height: 130 });
    act(() => { decode('9788O25703670'); decode('9788025703671'); decode('9788025703670'); });
    expect(success).not.toHaveBeenCalled();
    // A second camera frame, rather than a second result within the same instant.
    await new Promise(resolve => setTimeout(resolve, 45));
    act(() => { decode('9788025703670'); decode('9788025703670'); });
    expect(success).toHaveBeenCalledExactlyOnceWith('9788025703670');
    expect(close).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(camera.stop).toHaveBeenCalled());
  });
});
