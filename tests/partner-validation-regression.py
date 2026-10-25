"""Run with python3; needs the injected partner preview session and localhost:8080."""
import asyncio
import os
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [
            os.environ["LOVABLE_BROWSER_SUPABASE_STORAGE_KEY"],
            os.environ["LOVABLE_BROWSER_SUPABASE_SESSION_JSON"],
        ])
        await page.goto("http://localhost:8080/parceiro/validar")
        fixture = '[{"id":"00000000-0000-0000-0000-000000000001","customer_id":"00000000-0000-0000-0000-000000000002","card_number":"12345678","status":"ativo","expires_at":null}]'
        endpoint = "**/rest/v1/rpc/lookup_card_for_validation"
        await page.route(endpoint, lambda route: route.fulfill(status=200, content_type="application/json", body=fixture))
        code = page.get_by_placeholder("QR ou número")
        await code.fill("12345678")
        await page.get_by_role("button", name="Buscar", exact=True).click()
        confirm = page.get_by_role("button", name="Confirmar validação")
        await confirm.wait_for()
        # Changing the searched code invalidates the previously authorized card.
        await code.fill("87654321")
        assert await confirm.count() == 0
        await page.unroute(endpoint)
        await page.route(endpoint, lambda route: route.fulfill(status=500, content_type="application/json", body='{"message":"test failure"}'))
        await page.get_by_role("button", name="Buscar", exact=True).click()
        await page.get_by_text("Não foi possível consultar o cartão. Tente novamente.", exact=True).wait_for()
        # A failed lookup cannot authorize a purchase for the preceding card.
        assert await confirm.count() == 0
        assert await page.get_by_role("button", name="Buscar", exact=True).is_enabled()
        await browser.close()
        print("Partner lookup authorization regression passed")


asyncio.run(main())