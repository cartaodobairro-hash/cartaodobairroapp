import { describe, expect, it } from "vitest";
import type { AnyRoute } from "@tanstack/react-router";
import { isSitemapRouteIncluded, sitemapXML } from "./sitemap";

describe("public sitemap", () => {
  it("uses the published custom domain and omits invented modification dates", () => {
    const xml = sitemapXML("https://cartaodobairro.online", [{ path: "/" }, { path: "/planos" }]);
    expect(xml).toContain("<loc>https://cartaodobairro.online/planos</loc>");
    expect(xml).not.toContain("lastmod");
  });

  it("cannot include a child of an excluded authenticated section", () => {
    const parent = { options: { staticData: { sitemap: "exclude-subtree" } } };
    const child = { options: { staticData: { sitemap: true } }, parentRoute: parent } as unknown as AnyRoute;
    expect(isSitemapRouteIncluded(child)).toBe(false);
  });

  it("rejects query strings and external destinations", () => {
    expect(() => sitemapXML("https://cartaodobairro.online", [{ path: "//example.com" }])).toThrow();
    expect(() => sitemapXML("https://cartaodobairro.online", [{ path: "/auth?modo=cadastro" }])).toThrow();
  });
});