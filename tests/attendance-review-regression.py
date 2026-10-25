"""Authenticated live check; pass a test-only customer session file and usage ID.
python3 tests/attendance-review-regression.py /tmp/browser/customer.json <usage-id>
The attendance must belong to that isolated test customer; this writes one review.
"""
import asyncio
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright


async def main():
    stored = json.loads(Path(sys.argv[1]).read_text())
    usage_id = sys.argv[2]
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        await page.goto("http://localhost:8080")
        await page.evaluate("([k,v])=>localStorage.setItem(k,v)", [stored["storage_key"], json.dumps(stored["session"])])
        await page.goto("http://localhost:8080/app/notificacoes")
        await page.get_by_role("button", name="Avaliar parceiro", exact=True).click()
        await page.get_by_role("button", name="5 estrelas", exact=True).click()
        await page.get_by_label("Comentário (opcional)").fill("Avaliação de teste isolado")
        await page.get_by_role("button", name="Enviar avaliação", exact=True).click()
        await page.get_by_text("Avaliação enviada", exact=True).wait_for()
        # The invitation comes from a real committed attendance, not a UI fixture.
        result = await page.evaluate("""async (usage) => {
          const {supabase}=await import('/src/integrations/supabase/client.ts');
          const {data:notification,error:nError}=await supabase.from('notifications').select('user_id,partner_id,read_at').eq('card_usage_id',usage).single();
          const {data:review,error:rError}=await supabase.from('reviews').select('rating,partner_id').eq('card_usage_id',usage).single();
          const {data:partner}=await supabase.from('partners').select('rating,reviews_count').eq('id',review.partner_id).single();
          const {error:duplicate}=await supabase.rpc('submit_attendance_review',{_usage_id:usage,_rating:5,_comment:''});
          const {error:other}=await supabase.rpc('submit_attendance_review',{_usage_id:'00000000-0000-0000-0000-000000000000',_rating:5,_comment:''});
          return {notification,review,partner,errors:!!(nError||rError),duplicateRejected:!!duplicate,otherRejected:!!other};
        }""", usage_id)
        assert not result["errors"]
        assert result["notification"]["user_id"] == stored["session"]["user"]["id"]
        assert result["notification"]["read_at"] is not None
        assert result["review"]["rating"] == 5
        assert result["review"]["partner_id"] == result["notification"]["partner_id"]
        assert result["partner"]["reviews_count"] >= 1
        assert result["duplicateRejected"]
        assert result["otherRejected"]
        await page.screenshot(path="/tmp/browser/attendance-reviews/review-sent.png")
        await page.goto("http://localhost:8080/empresa/" + result["review"]["partner_id"])
        await page.get_by_text("Avaliação de teste isolado", exact=True).wait_for()
        await page.screenshot(path="/tmp/browser/attendance-reviews/partner-review.png")
        assert not errors, errors
        await browser.close()
        print("Attendance notification, customer review, rating update and ownership checks passed")


asyncio.run(main())