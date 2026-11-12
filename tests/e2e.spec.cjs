const {test,expect}=require('@playwright/test');
const products=require('../products.json');
const go=async(page,path='index.html')=>{await page.goto(path);await expect(page.locator('body')).toHaveAttribute('data-store-ready','true')};
const close=page=>page.getByRole('button',{name:'Закрыть окно',exact:true}).click();
test('all products, colors, modal feedback, cart totals and persistence',async({page})=>{test.setTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await go(page,'shop.html');const seen=[];for(let n=1;n<=3;n++){if(n>1)await page.getByRole('button',{name:'Следующая страница'}).click();const cards=page.locator('#catalog-grid .product-card:visible');const count=await cards.count();for(let i=0;i<count;i++){const c=cards.nth(i),id=await c.getAttribute('data-product');seen.push(id);await c.locator('[data-view]').first().click();await expect(page.locator('.dialog-product .price')).toHaveText(new Intl.NumberFormat('ru-BY',{style:'currency',currency:'BYN',currencyDisplay:'code',minimumFractionDigits:0,maximumFractionDigits:2}).format(products.find(x=>x.id===id).price));await page.locator('[data-color]').last().click();await page.getByRole('button',{name:'Добавить в корзину ＋',exact:true}).click();await expect(page.locator('#dialog-status')).toContainText('добавлен');await close(page)}}expect(new Set(seen).size).toBe(16);await page.getByRole('button',{name:'Корзина',exact:true}).click();await expect(page.locator('.collection-row')).toHaveCount(16);expect((await page.locator('.cart-total').innerText()).replace(/\D/g,'')).toBe(String(products.reduce((s,p)=>s+p.price,0)));await close(page);await page.reload();await page.getByRole('button',{name:'Корзина',exact:true}).click();await expect(page.locator('.collection-row')).toHaveCount(16);expect(errors).toEqual([])});
test('combined filters, Russian search, sorting, empty state and reset',async({page})=>{await go(page,'shop.html?room=Кухня');await page.getByLabel('Материал',{exact:true}).selectOption('Дерево');await expect(page.locator('#result-count')).toHaveText('1–3 из 3 товаров');await page.getByRole('button',{name:'Сбросить фильтры'}).click();await page.getByLabel('Поиск мебели').fill('теплый');await expect(page.locator('#result-count')).toHaveText('1–1 из 1 товаров');await page.getByLabel('Поиск мебели').fill('неттакоготовара');await expect(page.locator('#empty-results')).toBeVisible();await page.getByRole('button',{name:'Показать всю мебель'}).click();await page.getByLabel('Сортировка',{exact:true}).selectOption('price-asc');await expect(page.locator('#catalog-grid .product-card:visible').first()).toHaveAttribute('data-product','bar-stool');await page.getByRole('slider').press('Home');await expect(page.locator('#empty-results')).toBeVisible()});
test('favorites, profile, order draft download and removal',async({page})=>{await go(page);await page.locator('[data-favorite="sofa"]').click();await page.getByRole('button',{name:'Избранное',exact:true}).click();await expect(page.locator('.collection-row')).toHaveCount(1);await page.getByRole('button',{name:'В корзину ＋',exact:true}).click();await close(page);await page.getByRole('button',{name:'Корзина',exact:true}).click();await page.getByRole('button',{name:'Сохранить подборку ↗'}).click();await page.getByLabel('Имя для подборки').fill('Тест');await page.getByRole('button',{name:'Сохранить подборку',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать список'}).click();expect((await download).suggestedFilename()).toMatch(/^fstore-.*\.txt$/);await page.getByRole('button',{name:'Удалить подборку'}).click();await expect(page.locator('.order-row')).toHaveCount(0);await close(page);await page.getByRole('button',{name:'Мой профиль'}).click();await page.getByLabel('Имя',{exact:true}).fill('Тестовый покупатель');await page.getByRole('button',{name:'Сохранить данные'}).click();await close(page);await page.reload();await page.getByRole('button',{name:'Мой профиль'}).click();await expect(page.getByLabel('Имя',{exact:true})).toHaveValue('Тестовый покупатель')});
test('contact validation and local draft',async({page})=>{await go(page,'contact.html');await page.getByRole('button',{name:'Подготовить обращение ↗'}).click();await expect(page.locator('#contact-feedback')).toBeEmpty();await page.getByLabel('Как вас зовут').fill('Тест');await page.getByLabel('Электронная почта',{exact:true}).fill('qa@example.com');await page.getByLabel('Сообщение',{exact:true}).fill('Проверка сообщения');await page.getByRole('button',{name:'Подготовить обращение ↗'}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать обращение'}).click();expect((await download).suggestedFilename()).toBe('fstore-обращение.txt')});
for(const width of [320,360,390,600,768,800,801,1024,1440,1920])test(`Russian pages and no overflow at ${width}px`,async({page})=>{await page.setViewportSize({width,height:900});for(const path of ['index.html','shop.html','about.html','contact.html','room.html']){await go(page,path);await expect(page.locator('html')).toHaveAttribute('lang','ru');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}});
test('mobile menu, filters and keyboard dialog dismissal',async({page})=>{await page.setViewportSize({width:390,height:844});await go(page);await page.getByRole('button',{name:'Открыть меню'}).click();await page.getByRole('link',{name:'Каталог',exact:true}).click();await page.getByRole('button',{name:'Фильтры ＋'}).click();await page.getByLabel('Материал',{exact:true}).selectOption('Ротанг');await expect(page.locator('#result-count')).toHaveText('1–1 из 1 товаров');await page.locator('.product-card:visible [data-view]').first().press('Enter');await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible()});
test('invalid saved data and unavailable storage keep controls working',async({page})=>{await page.addInitScript(()=>{localStorage.setItem('fstore-v2-cart','{}');localStorage.setItem('fstore-v2-favorites','null');localStorage.setItem('fstore-v2-profile','[]');localStorage.setItem('fstore-v2-drafts','[null]')});await go(page);await page.getByRole('button',{name:'Корзина',exact:true}).click();await expect(page.locator('.empty-state')).toContainText('Корзина пока пуста')});
test('Blender model, palettes, walk controls and selected set',async({page,browserName})=>{test.skip(browserName==='webkit','WebGL availability varies on Linux WebKit; fallback is covered separately');await go(page,'room.html');await expect(page.locator('body')).toHaveAttribute('data-room-ready','true',{timeout:30000});await expect(page.locator('canvas')).toBeVisible();await page.getByRole('button',{name:'Терракота',exact:true}).click();await expect(page.getByRole('button',{name:'Терракота',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('switch',{name:'Вечерний свет'}).click();await expect(page.getByRole('switch',{name:'Вечерний свет'})).toHaveAttribute('aria-checked','true');await page.getByRole('button',{name:'Прогулка',exact:true}).click();await expect(page.locator('#walk-controls')).toBeVisible();await page.getByRole('button',{name:'Шаг вправо'}).click();await page.getByRole('button',{name:'Общий вид',exact:true}).click();await page.locator('[data-room-include="floor-lamp"]').uncheck();await expect(page.locator('#room-total')).toContainText('4 020');await page.getByRole('button',{name:'Добавить выбранное в корзину'}).click();await page.getByRole('button',{name:'Корзина',exact:true}).click();await expect(page.locator('.collection-row')).toHaveCount(4);await expect(page.locator('.collection-row').first()).toContainText('Терракота')});
test('model request failure has useful fallback and functioning cart',async({page})=>{await page.route('**/room.glb*',r=>r.abort());await go(page,'room.html');await expect(page.locator('#room-fallback')).toBeVisible({timeout:35000});await page.getByRole('button',{name:'Добавить выбранное в корзину'}).click();await page.getByRole('button',{name:'Корзина',exact:true}).click();await expect(page.locator('.collection-row')).toHaveCount(5)});

test('interior replacements, finishes, budget, undo and persistence',async({page})=>{
  await go(page,'room.html');
  await page.locator('[data-preset="warm"]').click();
  await expect(page.locator('#room-total')).toContainText('5 070');
  await expect(page.locator('#variant-chair')).toHaveValue('classic-armchair');
  await expect(page.locator('#variant-storage')).toHaveValue('sideboard');
  await page.getByLabel('Стены',{exact:true}).selectOption('sage');
  await page.getByLabel('Пол',{exact:true}).selectOption('ash');
  await page.getByLabel('Расстановка',{exact:true}).selectOption('open');
  await page.locator('#variant-storage').selectOption('nightstand');
  await expect(page.locator('#studio-total')).toContainText('4 240');
  await page.getByRole('button',{name:'Отменить изменение'}).click();
  await expect(page.locator('#variant-storage')).toHaveValue('sideboard');
  await page.getByRole('slider',{name:'Мой бюджет'}).press('Home');
  await expect(page.locator('#budget-status')).toContainText('Выше бюджета на 3 070');
  await page.reload();
  await expect(page.locator('#room-layout-select')).toHaveValue('open');
  await expect(page.locator('#room-wall')).toHaveValue('sage');
  await expect(page.locator('#room-floor')).toHaveValue('ash');
  await expect(page.locator('#room-total')).toContainText('5 070');
  await page.getByRole('button',{name:'Добавить выбранное в корзину'}).click();
  await page.getByRole('button',{name:'Корзина',exact:true}).click();
  await expect(page.locator('.collection-row')).toHaveCount(5);
  await expect(page.locator('.cart-total')).toContainText('5 070');
  await expect(page.locator('.collection-row').filter({hasText:'Кресло «Тихо»'})).toHaveCount(1);
  await expect(page.locator('.collection-row').filter({hasText:'Комод «Горизонт»'})).toHaveCount(1);
});
test('share link restores exact room in fresh storage',async({page,context})=>{
  await go(page,'room.html');await page.locator('[data-preset="open"]').click();
  await page.getByLabel('Стены',{exact:true}).selectOption('sage');
  await page.getByRole('button',{name:'Поделиться интерьером ↗'}).click();
  const url=await page.locator('#room-share-url').inputValue();
  expect(url).toContain('#room=');
  await page.evaluate(()=>localStorage.removeItem('fstore-room-v3'));
  await page.goto('about:blank');await page.goto(url);
  await expect(page.locator('#room-layout-select')).toHaveValue('open');
  await expect(page.locator('#room-wall')).toHaveValue('sage');
  await expect(page.locator('[data-room-include="classic-armchair"]')).not.toBeChecked();
  await expect(page.locator('#room-total')).toContainText('3 550');
});
test('empty room, recovery, corrupt data and storage denial',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('fstore-room-v3','{broken');Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('denied')}})});
  await go(page,'room.html');
  await expect(page.locator('#room-save-status')).toContainText('память браузера недоступна');
  for(const id of ['sofa','modern-armchair','coffee-table','nightstand','floor-lamp'])await page.locator(`[data-room-include="${id}"]`).uncheck();
  await expect(page.locator('#room-total')).toContainText('0 шт.');
  await expect(page.locator('#add-room-set')).toBeDisabled();
  await page.locator('[data-preset="calm"]').click();
  await expect(page.locator('#room-total')).toContainText('4 440');
  await expect(page.locator('#add-room-set')).toBeEnabled();
});
test('3D pins, model replacement, transform, removal and undo',async({page,browserName})=>{
  test.skip(browserName==='webkit','Linux WebKit does not provide WebGL reliably');
  await go(page,'room.html');await expect(page.locator('body')).toHaveAttribute('data-room-ready','true',{timeout:30000});
  await expect(page.locator('.price-pin:visible')).toHaveCount(5);
  await page.locator('[data-pin="chair"]').click();
  await page.getByLabel('Заменить на',{exact:true}).selectOption('classic-armchair');
  await expect(page.locator('[data-pin="chair"]')).toContainText('690');
  await page.getByRole('button',{name:'Сдвинуть предмет вперёд',exact:true}).click();
  await expect(page.locator('#room-status')).toContainText('Положение предмета изменено');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('fstore-room-v3')).positions.chair[1])).toBeCloseTo(.32);
  await page.getByRole('button',{name:'Убрать из комнаты',exact:true}).click();
  await expect(page.locator('[data-pin="chair"]')).toBeHidden();
  await expect(page.locator('#room-total')).toContainText('3 550');
  await page.getByRole('button',{name:'Отменить изменение'}).click();
  await expect(page.locator('[data-pin="chair"]')).toBeVisible();
  await page.getByRole('button',{name:'Цены',exact:true}).click();await expect(page.locator('#price-labels')).toBeHidden();
  await page.getByRole('button',{name:'Сверху',exact:true}).click();await expect(page.locator('[data-mode="plan"]')).toHaveAttribute('aria-pressed','true');
});
test('mobile configurator selections stay within the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await go(page,'room.html');
  await page.locator('[data-preset="warm"]').click();await page.locator('[data-focus-product="classic-armchair"]').click();
  await page.getByLabel('Заменить на',{exact:true}).selectOption('modern-armchair');
  await expect(page.locator('#selected-furniture')).toContainText('Кресло «Линия»');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole('button',{name:'Убрать из комнаты',exact:true}).click();
  await expect(page.locator('#room-total')).toContainText('4 380');
});

test('BYN is retained in old carts, saved lists and downloaded files',async({page})=>{
  const items=[{id:'sofa',color:'Зелёный',quantity:2},{id:'coffee-table',color:'Коричневый',quantity:1}];
  await page.addInitScript(items=>{localStorage.setItem('fstore-v2-cart',JSON.stringify(items));localStorage.setItem('fstore-v2-drafts',JSON.stringify([{id:'OLD-ROOM',date:'10.11.2026',customer:{name:'Тест'},items}]))},items);
  await go(page,'shop.html');
  for(const price of await page.locator('.product-bottom strong:visible').allTextContents()){expect(price).toContain('BYN');expect(price).not.toMatch(/₽|RUB/)}
  await page.getByRole('button',{name:'Корзина',exact:true}).click();
  await expect(page.locator('.cart-total')).toContainText('5 100');
  await expect(page.locator('.cart-total')).toContainText('BYN');
  await close(page);await page.getByRole('button',{name:'Мои подборки',exact:true}).click();
  await expect(page.locator('.order-row')).toContainText('5 100');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать список',exact:true}).click();
  const text=require('node:fs').readFileSync(await (await download).path(),'utf8');expect(text).toContain('BYN');expect(text).not.toMatch(/₽|RUB/);expect(text).toContain('Итого: 5 100');
});
test('old shared interior gets a valid BYN budget and keeps its layout',async({page})=>{
  const old={layout:'open',palette:'clay',floor:'walnut',wall:'sage',chair:'classic-armchair',storage:'sideboard',enabled:['sofa','chair'],budget:150000,positions:{chair:[1.3,.4,.5]}};
  await go(page,'room.html#room='+encodeURIComponent(JSON.stringify(old)));
  await expect(page.locator('#room-budget')).toHaveValue('5500');
  await expect(page.locator('#budget-value')).toContainText('BYN');
  await expect(page.locator('#room-total')).toContainText('2 980');
  await expect(page.locator('#room-layout-select')).toHaveValue('open');
  await page.getByRole('button',{name:'Поделиться интерьером ↗'}).click();
  const url=new URL(await page.locator('#room-share-url').inputValue());const saved=JSON.parse(decodeURIComponent(url.hash.slice(6)));
  expect(saved.currency).toBe('BYN');expect(saved.budget).toBe(5500);expect(saved.positions).toEqual(old.positions);
});
test('small-screen product dialog and long cart have no clipped controls',async({page})=>{
  await page.setViewportSize({width:320,height:740});await go(page,'shop.html');
  await page.locator('[data-view="modern-armchair"]').first().click();
  await expect(page.locator('.dialog-product .price')).toHaveText('890 BYN');
  expect(await page.locator('#panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.getByRole('button',{name:'Добавить в корзину ＋',exact:true}).click();
  await page.getByRole('button',{name:'Перейти в корзину →'}).click();
  await page.getByRole('button',{name:'Увеличить количество: Кресло «Линия»'}).click();
  await expect(page.locator('.cart-total')).toContainText('1 780');
  expect(await page.locator('#panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await page.getByRole('button',{name:'Сохранить подборку ↗'}).click();
  await page.getByLabel('Имя для подборки').fill('Очень длинное название комнаты '.repeat(6));
  expect(await page.locator('#panel').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
test('3D price labels never cover each other or camera controls',async({page,browserName})=>{
  test.skip(browserName==='webkit','Linux WebKit WebGL is covered by Chromium');
  await go(page,'room.html');await expect(page.locator('body')).toHaveAttribute('data-room-ready','true',{timeout:30000});
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});await page.getByRole('button',{name:'Сбросить вид ↺',exact:true}).click();
    await expect(page.locator('.price-pin:visible')).toHaveCount(5);
    await expect.poll(()=>page.evaluate(()=>{
      const pins=[...document.querySelectorAll('.price-pin')].filter(e=>!e.hidden).map(e=>e.getBoundingClientRect());
      const ui=[...document.querySelectorAll('.viewer-top,.viewer-bottom,.viewer-hint')].map(e=>e.getBoundingClientRect());
      const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
      return pins.some((a,i)=>pins.slice(i+1).some(b=>overlaps(a,b))||ui.some(b=>overlaps(a,b)));
    })).toBe(false);
  }
});
