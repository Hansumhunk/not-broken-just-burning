"""Browser QA of public newsletter staging. No external requests or subscriber data."""
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
server=ThreadingHTTPServer(('127.0.0.1',0),SimpleHTTPRequestHandler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch()
        for width,height in [(360,800),(768,1024),(1440,900)]:
            context=browser.new_context(viewport={'width':width,'height':height})
            context.route('**/*',lambda route: route.continue_() if route.request.url.startswith(base+'/') else route.abort())
            page=context.new_page()
            for name in ['flame-letter.html','flame-letter-preferences.html','index.html','join.html','resources.html','privacy.html']:
                response=page.goto(base+'/'+name,wait_until='domcontentloaded')
                assert response and response.ok,(name,width)
                assert page.locator('main').count()==1,(name,width)
                assert page.locator('main').is_visible(),(name,width)
                if name.startswith('flame-letter'):
                    assert page.locator('h1').count()==1,(name,width)
                    assert page.locator('form, iframe, input[type=email]').count()==0,(name,width)
                    assert page.get_by_role('link',name='Privacy & Data Use',exact=False).count()>=1 or page.locator('a[href="privacy.html"]').count()>=1
                    metrics=page.evaluate('({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth})')
                    assert metrics['scroll']<=metrics['view']+2,(name,width,metrics)
                else:
                    assert page.locator('a[href="flame-letter.html"], a[href="flame-letter-preferences.html"]').count()>=1,(name,width)
            page.goto(base+'/flame-letter.html')
            assert page.get_by_text('Subscriptions are not open yet.',exact=False).is_visible()
            assert page.locator('[data-flame-letter-signup] a').count()==0
            page.keyboard.press('Tab')
            assert page.evaluate('document.activeElement?.getAttribute("href")')=='#main-content'
            if page.locator('.nav-toggle').is_visible():
                page.locator('.nav-toggle').click()
                assert page.locator('.nav-toggle').get_attribute('aria-expanded')=='true'
            page.locator('a[href="flame-letter-preferences.html"]').first.click()
            assert page.url.endswith('/flame-letter-preferences.html')
            assert page.get_by_text('Visiting this page does not confirm',exact=False).is_visible()
            print(f'PASS actual Chromium viewport {width}x{height}: six routes, gated state, links, keyboard, newsletter overflow')
            context.close()
        browser.close()
finally:
    server.shutdown()
