"""
Limpia imágenes de producto removiendo texto/SKU embebido.
Guarda resultados en carpeta nueva como WebP.

Requiere: pip install opencv-python Pillow numpy
"""
import os
import io
import cv2
import numpy as np
from PIL import Image
from pathlib import Path

INPUT_DIR = r"C:\Users\Mi Pc\Desktop\IMAGENES_LIMPIAS"
OUTPUT_DIR = r"C:\Users\Mi Pc\Desktop\IMAGENES_LIMPIAS_SIN_TEXTO"
MAX_SIZE = (800, 800)
WEBP_QUALITY = 85

def remove_text_inpaint(img_pil):
    """Detecta regiones de texto y las inpinta."""
    # Convertir PIL a numpy RGB
    img_rgb = np.array(img_pil.convert("RGB"))
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

    # Grayscale
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Detectar texto: umbral adaptivo inverso (texto oscuro sobre fondo claro)
    # y también texto claro sobre fondo oscuro
    _, thresh_dark = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    _, thresh_light = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Combinar ambas detecciones
    combined = cv2.bitwise_or(thresh_dark, thresh_light)

    # Operaciones morfológicas para agrupar regiones de texto
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 3))
    dilated = cv2.dilate(combined, kernel, iterations=2)

    # Filtrar componentes conectados: quedarse solo con los pequeños (texto)
    # y descartar regiones grandes (producto completo)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(dilated, connectivity=8)
    mask = np.zeros_like(gray)

    h_img, w_img = gray.shape
    for i in range(1, num_labels):
        x, y, w, h, area = stats[i]
        # Heurística: texto suele ser ancho > alto, área pequeña, no ocupar toda la imagen
        aspect = w / max(h, 1)
        area_ratio = area / (h_img * w_img)
        if 1.5 < aspect < 30 and 50 < area < 8000 and area_ratio < 0.15 and h < h_img * 0.25:
            mask[labels == i] = 255

    # Dilatar máscara para cubrir mejor el texto
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8), iterations=2)

    # Inpainting
    if np.any(mask > 0):
        result_bgr = cv2.inpaint(img_bgr, mask, 3, cv2.INPAINT_TELEA)
    else:
        result_bgr = img_bgr

    # Volver a PIL
    result_rgb = cv2.cvtColor(result_bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(result_rgb)

def process_image(src_path, dst_path):
    img = Image.open(src_path)

    # Redimensionar si es muy grande
    img.thumbnail(MAX_SIZE, Image.LANCZOS)

    # Intentar limpiar texto
    cleaned = remove_text_inpaint(img)

    # Guardar como WebP
    cleaned.save(dst_path, "WEBP", quality=WEBP_QUALITY, method=6)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    files = [f for f in os.listdir(INPUT_DIR)
             if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'))]

    print(f"Procesando {len(files)} imagenes...")
    for i, fname in enumerate(sorted(files), 1):
        sku = Path(fname).stem
        dst = os.path.join(OUTPUT_DIR, f"{sku}.webp")
        try:
            process_image(os.path.join(INPUT_DIR, fname), dst)
            if i % 100 == 0:
                print(f"  {i}/{len(files)} procesadas...")
        except Exception as e:
            print(f"  ERROR {fname}: {e}")

    print(f"\nListo. Imagenes limpias guardadas en: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
