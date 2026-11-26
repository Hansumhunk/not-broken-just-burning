"""Synthetic browser fixture; no live connection or proprietary materials."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json, os
ROOT=Path(__file__).resolve().parents[1]
script=(ROOT/'js/member-advanced-collections.js').read_text()
css=(ROOT/'css/member-advanced-collections.css').read_text()
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROME_PATH') or '/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,args=['--no-sandbox'])
    for width in (390,1280):
        page=b.new_page(viewport={'width':width,'height':850})
        page.route('http://fixture.local/**',lambda route:route.fulfill(status=200,content_type='text/html',body='<html><head><style>'+css+'</style></head><body><section id="advanced-collections" hidden></section></body></html>'))
        page.goto('http://fixture.local/member-library.html?collection=mythic-resilience&lesson=mythic-resilience-l02')
        page.evaluate("""() => {window.fixtureUser={id:'one'};window.NBJBAuth={get user(){return window.fixtureUser},onChange(fn){window.changed=fn},client:{functions:{async invoke(name,{body}){if(body.action==='catalog')return {data:{lessons:Array.from({length:14},(_,i)=>({slug:'mythic-resilience-l'+String(i+1).padStart(2,'0'),title:'Fixture '+(i+1),module:i<4?1:i<8?2:i<11?3:4,access:[0,2,5,10].includes(i)?'free':'plus',available:[0,2,5,10].includes(i),minutes:'Suggested learning time: 20 minutes including reflection',objective:'Synthetic objective'}))}};return {data:{slug:body.slug,title:'Fixture reader',edition:'RC2',blocks:[{type:'p',text:'Synthetic content only https://example.org/source'}],questions:Array.from({length:5},()=>({text:'Fixture question'}))}}}}}}}""")
        page.add_script_tag(content=script)
        page.get_by_role('heading',name='Advanced Collections · Mythic Resilience').wait_for()
        assert page.locator('nav button').count()==14
        assert page.locator('nav button:disabled').count()==10
        assert page.get_by_role('heading',name='The Meaning of the Fire',exact=True).count()==1
        assert page.get_by_role('status').inner_text()=='This lesson is not currently available to your account.'
        assert page.get_by_role('article',name='Authorized lesson').inner_text()==''
        assert page.get_by_role('link',name='Free Support & Safety resources').get_attribute('href')=='support.html'
        page.get_by_role('button',name='Fixture 1 · Free',exact=True).focus()
        page.keyboard.press('Enter')
        page.get_by_role('heading',name='Fixture reader').wait_for()
        assert page.locator('h3:focus').count()==1
        assert page.url.endswith('collection=mythic-resilience&lesson=mythic-resilience-l01')
        panel=page.get_by_role('article',name='Authorized lesson')
        assert panel.get_by_role('link',name='https://example.org/source').get_attribute('href')=='https://example.org/source'
        assert 'including reflection' in panel.inner_text()
        assert panel.get_by_role('heading',name='Optional comprehension').count()==1
        assert panel.locator('ol li').count()==5
        assert panel.locator('input,textarea,form').count()==0
        assert panel.get_by_role('link',name='Free Support & Safety resources').get_attribute('href')=='support.html'
        assert panel.evaluate("e=>!!(e.querySelector('ol').compareDocumentPosition(e.querySelector('button')) & Node.DOCUMENT_POSITION_FOLLOWING)")
        page.get_by_role('button',name='Mark practiced on this device').click()
        page.get_by_role('button',name='Remove completion mark').wait_for()
        assert page.evaluate("!!JSON.parse(localStorage.getItem('nbjb.plus.lesson-progress.v1.one'))['mythic-resilience-l01']")
        assert page.evaluate("localStorage.getItem('nbjb.plus.lesson-progress.v1.two')===null")
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        page.evaluate("window.fixtureUser={id:'two'};window.changed({user:window.fixtureUser})")
        assert page.locator('#advanced-collections').is_hidden()
        assert 'Synthetic content only' not in page.locator('body').inner_text()
        # Reopen a legacy proposed lesson identifier on the actual library route.
        page.goto('http://fixture.local/member-library.html?collection=mythic-resilience&lesson=mr-l01')
        page.evaluate("""() => {window.NBJBAuth={user:{id:'one'},client:{functions:{async invoke(name,{body}){return body.action==='catalog'?{data:{lessons:[{slug:'mythic-resilience-l01',title:'Fixture 1',module:1,access:'free',available:true,minutes:'20 minutes',objective:'Fixture'}]}}:{data:{slug:body.slug,title:'Fixture reader',edition:'RC2',blocks:[],questions:[]}}}}}}}""")
        page.add_script_tag(content=script)
        page.get_by_role('heading',name='Fixture reader').wait_for()
        assert page.url.endswith('collection=mythic-resilience&lesson=mythic-resilience-l01')
        page.close()
        print(f'PASS {width}px synthetic navigation, keyboard, progress scoping, signout clearing, overflow')
    b.close()
