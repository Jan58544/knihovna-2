// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { startRobustScanner } from './robustScanner';

const decoder = vi.hoisted(() => ({ create: vi.fn(), decode: vi.fn() }));
vi.mock('@zxing/library', () => ({
  BarcodeFormat: { EAN_13: 7, CODE_128: 4 },
  DecodeHintType: { POSSIBLE_FORMATS: 2, TRY_HARDER: 3 },
  BrowserMultiFormatReader: class {
    constructor(hints) { decoder.create(hints); }
    decodeFromCanvas = decoder.decode;
  },
}));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.resetAllMocks(); });

it('delays difficult-code processing, preserves camera detail, and retries unreadable frames', async () => {
  vi.useFakeTimers();
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
  const video = { readyState: 4, videoWidth: 1280, videoHeight: 720 };
  const onDecode = vi.fn();
  decoder.decode.mockImplementationOnce(() => { throw new Error('No barcode'); })
    .mockReturnValue({ getText: () => '9788025703670' });
  const stop = startRobustScanner({ querySelector: () => video }, onDecode);
  await vi.advanceTimersByTimeAsync(749);
  expect(decoder.decode).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
  expect(decoder.create).toHaveBeenCalledWith(new Map([[2, [7, 4]], [3, true]]));
  expect(onDecode).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(250);
  expect(onDecode).toHaveBeenCalledExactlyOnceWith('9788025703670');
  stop();
  await vi.advanceTimersByTimeAsync(2000);
  expect(decoder.decode).toHaveBeenCalledTimes(2);
});

it('does not load or decode after the camera is closed', async () => {
  vi.useFakeTimers();
  const stop = startRobustScanner({ querySelector: vi.fn() }, vi.fn());
  stop();
  await vi.advanceTimersByTimeAsync(2000);
  expect(decoder.create).not.toHaveBeenCalled();
});
