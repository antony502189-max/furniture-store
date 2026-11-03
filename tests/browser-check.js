async (page) => {
 const base=new URL('./',page.url()).href;
 const passed=[], errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const assert=(ok,message)=>{if(!ok)throw Error(message)};
 const go=async(path='index.html')=>{await page.goto(base+path);await page.locator('body[data-store-ready="true"]').waitFor()};
 const close=()=>page.getByRole('button',{name:'Close dialog',exact:true}).click();
 const status=()=>page.locator('[data-node-id="1:855"]').textContent();
 await go();await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('.product-title').first().waitFor();
 await page.setViewportSize({width:1440,height:1000});
 // Each new-arrivals tab responds, including the empty states.
 for(const category of ['Chairs','Tables','Armchairs','Sofas','Decor','All']){
  await page.locator('[data-tab="'+category+'"]').click();
  assert(await page.locator('[data-tab="'+category+'"]').getAttribute('aria-pressed')==='true','Tab '+category);
  const n=await page.locator('[data-section="New products"] .product-card:visible').count();
  assert(n===({All:3,Chairs:2,Armchairs:1,Tables:0,Sofas:0,Decor:0})[category],'Tab result '+category);
 }
 passed.push('All 6 new-arrival tabs and empty states');
 // Favorite state persists across navigation and reload; adding does not open a product.
 await page.getByRole('button',{name:'Save Modern Armchair to favorites',exact:true}).first().click();
 assert(!await page.locator('dialog').isVisible(),'Favorite opened product');
 await page.reload();await page.locator('.product-title').first().waitFor();
 await page.getByRole('button',{name:'Favorites',exact:true}).click();
 assert(await page.locator('.collection-row').count()===1,'Favorite persistence');
 await page.getByRole('button',{name:'Add to bag',exact:true}).click();
 await page.getByRole('button',{name:'Remove Modern Armchair',exact:true}).click();
 assert((await page.locator('#panel-content').textContent()).includes('No favorites'),'Favorite removal');await close();
 passed.push('Favorites toggle, persistence, add to bag and removal');
 await go('shop.html');
 assert((await status()).includes('1–6 of 12'),'First page');
 const ids=[];
 for(let i=1;i<=2;i++){
  if(i===2)await page.getByRole('button',{name:'Next ›',exact:true}).click();
  const cards=page.locator('.catalog-grid .product-card:visible');assert(await cards.count()===6,'Page size');
  for(let j=0;j<6;j++){
   const card=cards.nth(j);const id=await card.getAttribute('data-product');ids.push(id);
   const expected=await card.getAttribute('data-price');
   await card.locator('[data-action="product"]').click();
   assert((await page.locator('.dialog-product h3').textContent()).replace(/[^0-9]/g,'')===expected,'Price mismatch '+id);
   await page.locator('dialog [data-color="Brown"]').click();
   assert(await page.locator('dialog [data-color="Brown"]').getAttribute('aria-pressed')==='true','Color selection');
   await page.getByRole('button',{name:'Add to bag',exact:true}).click();await close();
  }
 }
 assert(new Set(ids).size===12,'Pagination duplicate or missing products');
 await page.getByRole('button',{name:'Previous',exact:true}).click();assert((await status()).includes('1–6'),'Previous page');
 passed.push('All 12 catalog products: details, exact prices, colors, add to bag; both pages');
 await page.getByRole('button',{name:'Shopping bag',exact:true}).click();
 assert(await page.locator('.collection-row').count()===13,'Color variants not kept separately');
 const first=page.locator('.collection-row').first();await first.getByRole('button',{name:/Increase/}).click();
 assert((await page.locator('.quantity-controls').first().textContent()).includes('2'),'Increase quantity');
 await page.locator('.collection-row').first().getByRole('button',{name:/Decrease/}).click();
 await page.locator('.collection-row').first().getByRole('button',{name:/Remove/}).click();
 assert(await page.locator('.collection-row').count()===12,'Remove bag item');
 const total=await page.locator('.cart-total').textContent();assert(total.includes('$3,079'),'Cart total '+total);
 await page.getByRole('button',{name:'Prepare order',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Test Customer');await page.getByLabel('Email',{exact:true}).fill('customer@example.com');await page.getByLabel('Delivery address',{exact:true}).fill('Test address');
 await page.getByRole('button',{name:'Save order draft',exact:true}).click();
 assert(await page.locator('.order-row').count()===1,'Order save');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download draft',exact:true}).click();assert((await download).suggestedFilename().startsWith('DRAFT-'),'Order download');
 await close();await page.reload();await page.locator('.catalog-sort').waitFor();
 await page.getByRole('button',{name:'Orders',exact:true}).first().click();assert(await page.locator('.order-row').count()===1,'Order persistence');
 await page.getByRole('button',{name:'Delete draft',exact:true}).click();assert(await page.locator('.order-row').count()===0,'Delete draft');await close();
 passed.push('Cart variants, quantities, removal, $3,079 total; order draft save, reload, download and delete');
 // Categories, material, color, brand, range, sort, reset, and no-result recovery.
 await page.getByRole('checkbox',{name:'Tables',exact:true}).check();assert((await status()).includes('of 3'),'Tables filter');
 await page.getByRole('checkbox',{name:'Wood',exact:true}).check();assert((await status()).includes('of 3'),'Material filter');
 await page.getByRole('checkbox',{name:'Blue',exact:true}).check();assert((await status()).includes('of 3'),'Color filter');
 await page.getByRole('combobox',{name:'Sort products',exact:true}).selectOption('price-asc');
 const prices=await page.locator('.catalog-grid .product-card:visible').evaluateAll(cs=>cs.map(c=>Number(c.dataset.price)));assert(prices.join(',')==='150,160,250','Sort ascending');
 await page.getByRole('combobox',{name:'Sort products',exact:true}).selectOption('price-desc');
 const desc=await page.locator('.catalog-grid .product-card:visible').evaluateAll(cs=>cs.map(c=>Number(c.dataset.price)));assert(desc.join(',')==='250,160,150','Sort descending');
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();
 await page.getByRole('checkbox',{name:'White',exact:true}).check();assert((await status()).includes('0 results'),'Empty color filter');
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();assert((await status()).includes('of 12'),'Reset filters');
 await page.getByRole('button',{name:'Filter by brand 1',exact:true}).click();assert((await status()).includes('of 3'),'Brand filter');await page.getByRole('button',{name:'Reset filters',exact:true}).click();
 const range=page.getByRole('slider',{name:'Maximum price'});await range.focus();await range.press('Home');assert((await status()).includes('0 results'),'Price slider');await page.getByRole('button',{name:'Reset filters',exact:true}).click();
 passed.push('Category, material, color, brand, price, both price sorts, reset and empty results');
 await page.getByRole('searchbox',{name:'Search products'}).fill('Coffee');await page.getByRole('button',{name:'Search',exact:true}).click();await page.locator('.catalog-sort').waitFor();assert((await status()).includes('of 1'),'Search');
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();assert((await status()).includes('of 12'),'Reset search');
 await go('shop.html?category=Armchairs');assert((await status()).includes('of 2'),'Linked category');
 await page.getByRole('checkbox',{name:'Armchairs',exact:true}).uncheck();assert((await status()).includes('of 12'),'Clear URL category');
 await go('shop.html?room=Bedroom');assert((await status()).includes('of 2'),'Room filter');
 passed.push('Search submit, URL category and room navigation, clearing category and search');
 await page.getByRole('button',{name:'Account',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Saved Customer');await page.getByLabel('Email',{exact:true}).fill('saved@example.com');await page.getByLabel('Delivery address',{exact:true}).fill('Saved address');await page.getByRole('button',{name:'Save details',exact:true}).click();assert((await page.locator('dialog .form-feedback').textContent()).includes('saved'),'Profile save');await close();
 await page.reload();await page.locator('.catalog-sort').waitFor();await page.getByRole('button',{name:'Addresses',exact:true}).click();assert(await page.getByRole('textbox',{name:'Delivery address',exact:true}).inputValue()==='Saved address','Address persistence');await close();
 for(const label of ['Returns','Return','Free Delivery','F.A.Q','Account details']){await page.getByRole('button',{name:label,exact:true}).click();assert(await page.locator('dialog').isVisible(),'Service '+label);await close()}
 passed.push('Profile/address save and reload; all service buttons');
 await page.getByRole('textbox',{name:'Newsletter email'}).fill('reader@example.com');await page.getByRole('button',{name:'Request subscription',exact:true}).click();assert(await page.getByRole('link',{name:'Open email app',exact:true}).count()===1,'Newsletter draft');
 const mail=await page.getByRole('link',{name:'Open email app',exact:true}).getAttribute('href');assert(mail.includes('reader%40example.com'),'Newsletter recipient');
 const newsletterDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download message',exact:true}).click();await newsletterDownload;
 await page.goto(base+'contact.html');
 await page.getByRole('button',{name:'Prepare email',exact:true}).click();assert(await page.locator('[data-form="contact"] .form-feedback').count()===0,'Invalid form submitted');
 await page.getByLabel('Name',{exact:true}).fill('Test Name');await page.getByLabel('Email',{exact:true}).fill('reply@example.com');await page.getByLabel('Message',{exact:true}).fill('Test message & details');await page.getByRole('button',{name:'Prepare email',exact:true}).click();
 const contactMail=await page.locator('[data-form="contact"]').getByRole('link',{name:'Open email app',exact:true}).getAttribute('href');assert(contactMail.includes('Test%20message%20%26%20details'),'Contact encoding');
 const messageDownload=page.waitForEvent('download');await page.locator('[data-form="contact"]').getByRole('button',{name:'Download message',exact:true}).click();await messageDownload;
 passed.push('Newsletter/contact validation, encoded email drafts, both message downloads');
 await go('about.html');await page.getByRole('button',{name:'View furniture showroom',exact:true}).click();
 const old=await page.locator('.dialog-gallery img').getAttribute('src');await page.getByRole('button',{name:'Next image',exact:true}).click();assert(await page.locator('.dialog-gallery img').getAttribute('src')!==old,'Gallery next');await page.getByRole('button',{name:'Previous image',exact:true}).click();assert(await page.locator('.dialog-gallery img').getAttribute('src')===old,'Gallery previous');await page.keyboard.press('Escape');assert(!await page.locator('dialog').isVisible(),'Escape close');
 passed.push('Showroom previous/next, Escape close');
 // No off-screen controls at the required mobile/tablet/desktop sizes.
 for(const width of [375,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of ['index.html','shop.html','about.html','contact.html']){
   await page.goto(base+path);await page.locator('[data-action="account"]').waitFor();
   await page.locator('body[data-store-ready="true"]').waitFor();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert(!overflow,`Overflow ${path} at ${width}`);
  }
 }
 await page.setViewportSize({width:390,height:844});await go('shop.html');
 await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();assert(await page.getByRole('navigation',{name:'Main navigation'}).isVisible(),'Mobile menu');
 await page.getByRole('button',{name:'Filters',exact:true}).click();assert(await page.getByRole('checkbox',{name:'Tables',exact:true}).isVisible(),'Mobile filters');
 await page.getByRole('checkbox',{name:'Tables',exact:true}).check();assert((await status()).includes('of 3'),'Mobile filter');
 await page.getByRole('button',{name:'Shopping bag',exact:true}).click();assert(await page.locator('.collection-row').count()===12,'Mobile persisted bag');await close();
 passed.push('4 pages at 375/390/768/1024/1440px; mobile menu, filters, persisted bag');
 assert(errors.length===0,'Browser errors: '+errors.join('; '));
 return {passed,checks:passed.length,browserErrors:errors};
}
