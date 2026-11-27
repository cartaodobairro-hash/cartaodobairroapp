import { describe, expect, it } from "vitest";
import { fitImageDimensions, IMAGE_PRESETS, optimizedImageName } from "./image-optimization";

describe("otimização de imagens", () => {
  it("limita banners a 1600 × 900 sem alterar a proporção", () => {
    expect(fitImageDimensions(4000, 3000, IMAGE_PRESETS.banner.maxWidth, IMAGE_PRESETS.banner.maxHeight))
      .toEqual({ width: 1200, height: 900 });
  });

  it("limita fotos de produtos a 1280 × 960", () => {
    expect(fitImageDimensions(3000, 4000, IMAGE_PRESETS.benefit.maxWidth, IMAGE_PRESETS.benefit.maxHeight))
      .toEqual({ width: 720, height: 960 });
  });

  it("não aumenta imagens que já são pequenas", () => {
    expect(fitImageDimensions(320, 240, 1600, 900)).toEqual({ width: 320, height: 240 });
  });

  it("usa a extensão compatível com o arquivo comprimido", () => {
    expect(optimizedImageName("foto do celular.heic", "image/webp")).toBe("foto do celular.webp");
    expect(optimizedImageName("logo.png", "image/jpeg")).toBe("logo.jpg");
  });

  it("mantém a meta de 250 KB para banners e produtos", () => {
    expect(IMAGE_PRESETS.banner.targetBytes).toBe(250 * 1024);
    expect(IMAGE_PRESETS.benefit.targetBytes).toBe(250 * 1024);
  });
});
