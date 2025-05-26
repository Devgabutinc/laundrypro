// Util konversi gambar PNG ke ESC/POS bytes (bitmap monokrom)
// Hanya support browser/Capacitor dengan canvas

export async function convertImageToEscposBytes(url: string, width: number = 384, logoWidth: number = 150): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // Hitung tinggi proporsional logo
      const scale = logoWidth / img.width;
      const logoHeight = Math.floor(img.height * scale);
      // Buat canvas selebar head printer
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = logoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas context error');
      // Fill putih
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, logoHeight);
      // Draw logo di tengah
      const x = Math.floor((width - logoWidth) / 2);
      ctx.drawImage(img, x, 0, logoWidth, logoHeight);
      // Ambil data pixel
      const imageData = ctx.getImageData(0, 0, width, logoHeight);
      const pixels = imageData.data;
      // Konversi ke monokrom (threshold 128)
      const mono = [];
      for (let y = 0; y < logoHeight; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = pixels[idx];
          const g = pixels[idx + 1];
          const b = pixels[idx + 2];
          const avg = (r + g + b) / 3;
          mono.push(avg < 128 ? 1 : 0);
        }
      }
      // ESC/POS: tiap byte = 8 pixel vertikal (bit 7 = atas)
      const bytesPerLine = Math.ceil(width / 8);
      const escpos = [];
      // GS v 0 m xL xH yL yH d1...dk
      escpos.push(0x1D, 0x76, 0x30, 0x00);
      escpos.push(width / 8 & 0xFF, (width / 8) >> 8); // xL, xH
      escpos.push(logoHeight & 0xFF, logoHeight >> 8); // yL, yH
      for (let y = 0; y < logoHeight; y++) {
        for (let xByte = 0; xByte < bytesPerLine; xByte++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            const x = xByte * 8 + bit;
            if (x < width) {
              const pixel = mono[y * width + x];
              byte |= (pixel ? 1 : 0) << (7 - bit);
            }
          }
          escpos.push(byte);
        }
      }
      resolve(new Uint8Array(escpos));
    };
    img.onerror = reject;
    img.src = url;
  });
} 