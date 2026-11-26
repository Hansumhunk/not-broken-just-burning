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
        page.goto('http://fixture.local/')
        page.evaluate("""() => {window.fixtureUser={id:'one'};window.NBJBAuth={get user(){return window.fixtureUser},onChange(fn){window.changed=fn},client:{functions:{async invoke(name,{body}){if(body.action==='catalog')return {data:{lessons:Array.from({length:14},(_,i)=>({slug:'mythic-resilience-l'+String(i+1).padStart(2,'0'),title:'Fixture '+(i+1),module:i<4?1:i<8?2:i<11?3:4,access:[0,2,5,10].includes(i)?'free':'plus',available:[0,2,5,10].includes(i),minutes:'20 minutes',objective:'Synthetic objective'}))}};return {data:{slug:body.slug,title:'Fixture reader',edition:'RC2',blocks:[{type:'p',text:'Synthetic content only'}],questions:Array.from({length:5},()=>({text:'Fixture question'}))}}}}}}}""")
        page.add_script_tag(content=script)
        page.get_by_role('heading',name='Advanced Collections · Mythic Resilience').wait_for()
        assert page.locator('nav button').count()==14
        assert page.locator('nav button:disabled').count()==10
        page.get_by_role('button',name='Fixture 1 · Free',exact=True).focus()
        page.keyboard.press('Enter')
        page.get_by_role('heading',name='Fixture reader').wait_for()
        assert page.locator('h3:focus').count()==1
        page.get_by_role('button',name='Mark practiced on this device').click()
        page.get_by_role('button',name='Remove completion mark').wait_for()
        assert page.evaluate("!!JSON.parse(localStorage.getItem('nbjb.plus.lesson-progress.v1.one'))['mythic-resilience-l01']")
        assert page.evaluate("localStorage.getItem('nbjb.plus.lesson-progress.v1.two')===null")
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
        page.evaluate("window.fixtureUser={id:'two'};window.changed({user:window.fixtureUser})")
        assert page.locator('#advanced-collections').is_hidden()
        assert 'Synthetic content only' not in page.locator('body').inner_text()
        page.close()
        print(f'PASS {width}px synthetic navigation, keyboard, progress scoping, signout clearing, overflow')
    b.close()
