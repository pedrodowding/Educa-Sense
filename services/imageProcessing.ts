export const processImageToLineArt = async (dataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get 2d context"));
          return;
        }

        const maxSize = 1024;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        const grayData = new Float32Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          grayData[i / 4] = gray;
        }

        const blurredData = new Float32Array(width * height);
        const kernel = [
          1, 2, 1,
          2, 4, 2,
          1, 2, 1
        ];
        const kernelSum = 16;

        const getGray = (x: number, y: number) => {
           if (x < 0) x = 0; if (x >= width) x = width - 1;
           if (y < 0) y = 0; if (y >= height) y = height - 1;
           return grayData[y * width + x];
        };

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
             let sum = 0;
             sum += getGray(x-1, y-1) * kernel[0];
             sum += getGray(x,   y-1) * kernel[1];
             sum += getGray(x+1, y-1) * kernel[2];
             sum += getGray(x-1, y)   * kernel[3];
             sum += getGray(x,   y)   * kernel[4];
             sum += getGray(x+1, y)   * kernel[5];
             sum += getGray(x-1, y+1) * kernel[6];
             sum += getGray(x,   y+1) * kernel[7];
             sum += getGray(x+1, y+1) * kernel[8];
             blurredData[y * width + x] = sum / kernelSum;
          }
        }

        const finalData = ctx.createImageData(width, height);
        const output = finalData.data;

        const getBlurred = (x: number, y: number) => {
            if (x < 0) x = 0; if (x >= width) x = width - 1;
            if (y < 0) y = 0; if (y >= height) y = height - 1;
            return blurredData[y * width + x];
        };

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const gx = 
              (-1 * getBlurred(x-1, y-1)) + (1 * getBlurred(x+1, y-1)) +
              (-2 * getBlurred(x-1, y))   + (2 * getBlurred(x+1, y)) +
              (-1 * getBlurred(x-1, y+1)) + (1 * getBlurred(x+1, y+1));

            const gy = 
              (-1 * getBlurred(x-1, y-1)) + (-2 * getBlurred(x, y-1)) + (-1 * getBlurred(x+1, y-1)) +
              (1 * getBlurred(x-1, y+1)) + (2 * getBlurred(x, y+1)) + (1 * getBlurred(x+1, y+1));

            let magnitude = Math.sqrt(gx * gx + gy * gy);

            magnitude = magnitude * 3;

            let pixelValue = 255 - magnitude;

            // Invert colors to get black lines on white
            if (pixelValue < 128) pixelValue = 0;
            else pixelValue = 255;

            const idx = (y * width + x) * 4;
            output[idx] = pixelValue;
            output[idx + 1] = pixelValue;
            output[idx + 2] = pixelValue;
            output[idx + 3] = 255;
          }
        }

        ctx.putImageData(finalData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
};

export interface CompressionResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mime: string;
}

export const compressAndResizeImage = async (file: File, maxWidth = 1600, quality = 0.8): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    // 1) Usar URL.createObjectURL para evitar carregar o arquivo inteiro na memória (FileReader)
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    
    // Cleanup helper
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        // Force JPEG for better compression as per requirements
        const mime = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        
        // Calculate size roughly
        const head = 'data:image/jpeg;base64,';
        const sizeBytes = Math.round((dataUrl.length - head.length) * 3 / 4);

        cleanup();
        resolve({
          dataUrl,
          width,
          height,
          sizeBytes,
          mime
        });
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    img.onerror = () => {
      cleanup();
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
};

export const validateColoringPagePattern = async (dataUrl: string): Promise<{ isValid: boolean; reason?: string }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ isValid: false, reason: "Canvas context error" });
          return;
        }

        const sampleSize = 256;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;
        const totalPixels = data.length / 4;

        let nonGrayCount = 0;
        let nonWhiteBackgroundCount = 0;
        
        const colorTolerance = 10; 
        const bwThreshold = 30;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (Math.abs(r - g) > colorTolerance || Math.abs(g - b) > colorTolerance) {
            nonGrayCount++;
          }

          const isDark = r < bwThreshold && g < bwThreshold && b < bwThreshold;
          const isLight = r > (255 - bwThreshold) && g > (255 - bwThreshold) && b > (255 - bwThreshold);

          if (!isDark && !isLight) {
             nonWhiteBackgroundCount++; 
          }
        }

        const colorErrorRate = nonGrayCount / totalPixels;
        const grayscaleErrorRate = nonWhiteBackgroundCount / totalPixels;

        if (colorErrorRate > 0.01) {
          resolve({ isValid: false, reason: `Contains colors (Error rate: ${(colorErrorRate*100).toFixed(1)}%)` });
          return;
        }

        if (grayscaleErrorRate > 0.15) {
          resolve({ isValid: false, reason: `Contains too much shading/grayscale (Error rate: ${(grayscaleErrorRate*100).toFixed(1)}%)` });
          return;
        }

        resolve({ isValid: true });

      } catch (e) {
        resolve({ isValid: false, reason: "Processing error" });
      }
    };
    
    img.onerror = () => resolve({ isValid: false, reason: "Image load error" });
    img.src = dataUrl;
  });
};
