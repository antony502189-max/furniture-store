async (page) => {
 const base=new URL('./',page.url()).href;const passed=[];const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
 const ready=()=>page.locator('body[data-store-ready="true"]').waitFor();
 await page.unroute('**/products.json');await page.setViewportSize({width:1440,height:1000});await page.goto(base+'about.html');await ready();
 const shopCTAs=page.locator('[data-name="Text+ icon"]').filter({hasText:'Shop now'});assert(await shopCTAs.count()===2,'Collection CTA count');
 for(let i=0;i<2;i++){assert(await shopCTAs.nth(i).getAttribute('href')==='shop.html','Collection CTA href')}
 await shopCTAs.first().click();await ready();assert(page.url().includes('shop.html'),'Collection CTA navigation');
 const sidebar=page.locator('[data-node-id="1:832"]>[role="button"]');assert(await sidebar.count()===4,'Sidebar actions');
 for(let i=0;i<4;i++){await sidebar.nth(i).focus();await page.keyboard.press('Enter');assert(await page.locator('dialog').isVisible(),'Sidebar keyboard');await page.getByRole('button',{name:'Close dialog',exact:true}).click()}
 const brand=page.getByRole('button',{name:'Filter by brand 1',exact:true});await brand.focus();await page.keyboard.press('Space');assert(await brand.getAttribute('aria-pressed')==='true','Brand keyboard double activation');
 const chairs=page.getByRole('checkbox',{name:'Chairs',exact:true});assert((await chairs.locator('..').locator('..').textContent()).includes('5'),'Actual sidebar count');
 passed.push('Both about collection links; all 4 sidebar products with keyboard; brand keyboard and real counts');
 await page.goto(base+'index.html');await ready();
 const hero=page.locator('[data-section="Hero"] [role="button"]');assert(await hero.count()===4,'Hero actions');
 await hero.last().focus();await page.keyboard.press('Enter');await ready();assert(page.url().includes('shop.html'),'Final hero keyboard');
 await page.goto(base+'about.html');await ready();await page.locator('[data-node-id="1:1210"]').focus();await page.keyboard.press('Space');assert(await page.locator('dialog').isVisible(),'Read more keyboard');await page.keyboard.press('Escape');
 passed.push('All 4 hero cards wired; final hero and Read more keyboard');
 // Corrupt previous browser storage must not prevent any startup handler.
 await page.evaluate(()=>{localStorage.setItem('furniture-cart','{}');localStorage.setItem('furniture-favorites','null');localStorage.setItem('furniture-profile','[]');localStorage.setItem('furniture-orders','[{"items":[]}]')});await page.reload();await ready();
 await page.getByRole('button',{name:'Shopping bag',exact:true}).click();assert((await page.locator('#panel-content').textContent()).includes('No items'),'Invalid storage fallback');await page.getByRole('button',{name:'Close dialog',exact:true}).click();
 // Block just the product data and check fallback startup remains usable.
 await page.route('**/products.json',route=>route.abort());await page.goto(base+'shop.html');await ready();await page.getByRole('button',{name:'Account',exact:true}).click();assert(await page.getByRole('button',{name:'Save details',exact:true}).isVisible(),'Network fallback account');await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.unroute('**/products.json');
 passed.push('Malformed storage and failed catalog request keep controls usable');
 assert(errors.length===0,'Errors: '+errors.join(';'));return {passed,browserErrors:errors};
}
