// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { MultiFormatReader } from '@zxing/library';
import { startRobustScanner } from './robustScanner';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

// EAN-13 symbol for 9788075551221, encoded using the standard left/right patterns.
function barcodePixels(isbn) {
  const left = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  const even = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  const parity = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'][Number(isbn[0])];
  let bars = '000000000000101';
  for (let i = 1; i <= 6; i++) bars += (parity[i-1] === 'L' ? left : even)[Number(isbn[i])];
  bars += '01010';
  for (let i = 7; i <= 12; i++) bars += left[Number(isbn[i])].replace(/[01]/g, bit => bit === '0' ? '1' : '0');
  bars += '101000000000000';
  const width = bars.length * 4, height = 160;
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = 10; y < height - 10; y++) {
    for (let x = 0; x < width; x++) {
      if (bars[Math.floor(x / 4)] === '1') {
        const offset = (y * width + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
      }
    }
  }
  return { width, height, pixels };
}

it.each(['9788075551221', '9788090613805', '9781398518179'])('decodes a real EAN-13 pixel fixture for %s using the installed library', async isbn => {
  vi.useFakeTimers();
  const { width, height, pixels } = barcodePixels(isbn);
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage, getImageData: () => ({ data: pixels }) });
  const video = { readyState: 4, videoWidth: width, videoHeight: height };
  const onDecode = vi.fn();
  const stop = startRobustScanner({ querySelector: () => video }, onDecode);
  await vi.advanceTimersByTimeAsync(749);
  expect(onDecode).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(drawImage).toHaveBeenCalledWith(video, 0, 0, width, height);
  expect(onDecode).toHaveBeenCalledExactlyOnceWith(isbn);
  stop();
  await vi.advanceTimersByTimeAsync(2000);
  expect(onDecode).toHaveBeenCalledTimes(1);
});

it('retries after an unreadable frame and stops on cleanup', async () => {
  vi.useFakeTimers();
  const decode = vi.spyOn(MultiFormatReader.prototype, 'decodeWithState')
    .mockImplementationOnce(() => { throw new Error('No code'); })
    .mockReturnValue({ getText: () => '9788075551221' });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(400) }) });
  const onDecode = vi.fn();
  const stop = startRobustScanner({ querySelector: () => ({ readyState: 4, videoWidth: 10, videoHeight: 10 }) }, onDecode);
  await vi.advanceTimersByTimeAsync(750);
  expect(onDecode).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(250);
  expect(onDecode).toHaveBeenCalledExactlyOnceWith('9788075551221');
  stop();
  await vi.advanceTimersByTimeAsync(2000);
  expect(decode).toHaveBeenCalledTimes(2);
});

it('does not decode after closing before the delayed start', async () => {
  vi.useFakeTimers();
  const container = { querySelector: vi.fn() };
  startRobustScanner(container, vi.fn())();
  await vi.advanceTimersByTimeAsync(2000);
  expect(container.querySelector).not.toHaveBeenCalled();
});
