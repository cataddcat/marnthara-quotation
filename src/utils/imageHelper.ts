// src/utils/imageHelper.ts

/**
 * ย่อรูปภาพและแปลงเป็น Base64 เพื่อเก็บใน LocalStorage
 * @param file ไฟล์รูปภาพต้นฉบับ
 * @param maxWidth ความกว้างสูงสุดที่ต้องการ (Default 500px พอสำหรับโลโก้)
 * @returns Promise<string> (Base64 string)
 */
export const compressImage = (file: File, maxWidth: number = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        // คำนวณ Aspect Ratio
        const scale = maxWidth / img.width;
        const finalWidth = maxWidth;
        const finalHeight = img.height * scale;

        // สร้าง Canvas เพื่อวาดรูปใหม่
        const canvas = document.createElement('canvas');
        canvas.width = finalWidth;
        canvas.height = finalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // วาดรูปลง Canvas (เป็นการย่อขนาด)
        ctx.drawImage(img, 0, 0, finalWidth, finalHeight);

        // แปลงกลับเป็น Base64 (JPEG Quality 0.7)
        // JPEG ประหยัดพื้นที่กว่า PNG มาก สำหรับ LocalStorage
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
};
