/* Static storefront interactions. Data stays in this browser. */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const node=id=>$(`[data-node-id="${id}"]`);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
function readSaved(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
let favorites=readSaved('furniture-favorites',[]),cart=readSaved('furniture-cart',[]);
let products=[];const panel=$('#panel');let returnFocus=null;
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000)}
function persist(){try{localStorage.setItem('furniture-favorites',JSON.stringify(favorites));localStorage.setItem('furniture-cart',JSON.stringify(cart))}catch{toast('Browser storage is unavailable. Your selections will last for this visit.')}updateCounters()}
function updateCounters(){ $$('[data-count="favorites"]').forEach(n=>n.textContent=favorites.length);$$('[data-count="cart"]').forEach(n=>n.textContent=cart.reduce((s,p)=>s+p.quantity,0));$$('[data-action="favorite"]').forEach(b=>{const saved=favorites.some(p=>p.id===b.closest('[data-product]')?.dataset.product);b.setAttribute('aria-pressed',String(saved))})}
function showPanel(title,body){returnFocus=document.activeElement;$('#panel-content').innerHTML=`<h2 id="panel-title" class="dialog-heading">${safe(title)}</h2>${body}`;if(!panel.open)panel.showModal()}
panel.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus()});
panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)panel.close()}});
function fromCard(card){return {id:card.dataset.product,title:card.dataset.title,price:Number(card.dataset.price),image:$('img[src$=".png"]',card)?.getAttribute('src')}}
function product(id){return products.find(p=>p.id===id)||favorites.find(p=>p.id===id)||cart.find(p=>p.id===id)}
function viewProduct(p){if(!p)return;showPanel(p.title,`<div class="dialog-product"><img src="${safe(p.image)}" alt="${safe(p.title)}"><div><h3>${money(p.price)}</h3><p>Furniture for a comfortable home.</p><button class="primary-button" data-add="${safe(p.id)}">Add to bag</button><p class="dialog-note">Demo store. Purchases and payments are not enabled.</p></div></div>`);panel.dataset.product=JSON.stringify(p)}
function addToCart(p){if(!p)return;const existing=cart.find(x=>x.id===p.id);if(existing)existing.quantity++;else cart.push({...p,quantity:1});persist();toast(p.title+' added to bag')}
function collection(type){const list=type==='cart'?cart:favorites;showPanel(type==='cart'?'Shopping bag':'Favorites',list.length?list.map(p=>`<div class="collection-row"><img src="${safe(p.image)}" alt=""><div><strong>${safe(p.title)}</strong><span>${money(p.price)}</span>${type==='cart'?`<div class="quantity-controls"><button data-quantity="${safe(p.id)}" data-delta="-1" aria-label="Decrease ${safe(p.title)} quantity">−</button><span>${p.quantity}</span><button data-quantity="${safe(p.id)}" data-delta="1" aria-label="Increase ${safe(p.title)} quantity">+</button></div>`:''}</div><button data-remove="${safe(p.id)}" data-kind="${type}" aria-label="Remove ${safe(p.title)}">Remove</button></div>`).join('')+(type==='cart'?`<p class="cart-total">Total: <strong>${money(cart.reduce((s,p)=>s+p.price*p.quantity,0))}</strong></p><p class="dialog-note">This is a demo shopping bag. Checkout and payments are not connected.</p>`:''):`<p>No ${type==='cart'?'items in your bag':'favorites'} yet. Explore the collection and choose a piece you love.</p><a class="primary-button" href="shop.html" style="margin-top:24px">Explore the collection</a>`)}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action],[data-add],[data-remove],[data-quantity]');if(!b)return;
 if(b.dataset.add){addToCart(panel.dataset.product?JSON.parse(panel.dataset.product):product(b.dataset.add));return}
 if(b.dataset.remove){if(b.dataset.kind==='cart')cart=cart.filter(x=>x.id!==b.dataset.remove);else favorites=favorites.filter(x=>x.id!==b.dataset.remove);persist();collection(b.dataset.kind);return}
 if(b.dataset.quantity){const p=cart.find(x=>x.id===b.dataset.quantity);if(p)p.quantity+=Number(b.dataset.delta);cart=cart.filter(x=>x.quantity>0);persist();collection('cart');return}
 const action=b.dataset.action;
 if(action==='close')panel.close();
 if(action==='menu'){const nav=$('.main-nav');nav.classList.toggle('open');b.setAttribute('aria-expanded',String(nav.classList.contains('open')))}
 if(action==='product'){viewProduct(fromCard(b.closest('[data-product]')))}
 if(action==='favorite'){e.stopPropagation();const p=fromCard(b.closest('[data-product]'));const saved=favorites.some(x=>x.id===p.id);favorites=saved?favorites.filter(x=>x.id!==p.id):[...favorites,p];persist();toast(saved?'Removed from favorites':p.title+' saved to favorites')}
 if(action==='favorites'||action==='cart')collection(action);
 if(action==='account')showPanel('Welcome to Furniture Store','<p>Explore the collection and save your favorite pieces. Your favorites and shopping bag are saved on this device.</p><p class="dialog-note">This demo does not require an account. Account registration is not connected.</p><a class="primary-button" href="shop.html" style="margin-top:24px">Browse furniture</a>');
 if(action==='film')showPanel('Furniture for every home','<div class="dialog-gallery"><img src="assets/home-imgImgButton.png" alt="Furniture interior from the original design"><p class="dialog-note">Thoughtful pieces for comfortable living. The design includes a video preview image; no video was supplied.</p><a class="primary-button" href="about.html" style="margin-top:24px">Our story</a></div>');
});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button][data-action]')){e.preventDefault();e.target.click()}});
$$('form[data-form]').forEach(form=>form.addEventListener('submit',e=>{
 e.preventDefault();if(!form.reportValidity())return;let feedback=$('.form-feedback',form);if(!feedback){feedback=document.createElement('p');feedback.className='form-feedback';feedback.setAttribute('role','status');form.append(feedback)}
 feedback.textContent=form.dataset.form==='contact'?'Your message has not been sent. This demo form is not connected to a messaging service.':'Your email has not been subscribed. Newsletter delivery is not connected in this demo.';
}));
function linkify(el,href){if(!el)return;const a=document.createElement('a');for(const attr of el.attributes)a.setAttribute(attr.name,attr.value);a.href=href;a.innerHTML=el.innerHTML;el.replaceWith(a);return a}
linkify(node('1:140'),'shop.html');
$$('[data-section="Categories"] [data-name="Card"]').forEach(c=>{const title=$('[data-name="Text"]',c)?.textContent.trim().split(/\s+/)[0];linkify(c,'shop.html?category='+encodeURIComponent(title||''))});
$$('[data-section="Gallery"] [data-name="Img+label"]').forEach(c=>{const title=$('[data-name="Label"]',c)?.textContent.trim();linkify(c,'shop.html?room='+encodeURIComponent(title||''))});
$$('[data-node-id="1:573"]>[data-name="Icon+ text"]').forEach(c=>{const title=$('[data-name="Text"]',c)?.textContent.trim().split(/\s+/)[0];linkify(c,'shop.html?category='+encodeURIComponent(title||''))});
$$('footer [data-name="Social icons"]').forEach(group=>$$(':scope>div',group).forEach((icon,i)=>{icon.tabIndex=0;icon.role='button';icon.setAttribute('aria-label',['Facebook','X','Instagram','YouTube'][i]);icon.addEventListener('click',()=>showPanel('Follow Furniture Store','<p>Social profiles are not connected in this demo.</p>'));icon.addEventListener('keydown',e=>{if(e.key==='Enter')icon.click()})}));
$$('footer [data-name="Text"]>p').filter(p=>['Orders','Addresses','Returns','Account details','F.A.Q','Return','Free Delivery'].includes(p.textContent.trim())).forEach(p=>{const label=p.textContent.trim();const button=document.createElement('button');button.className=p.className;button.textContent=label;button.addEventListener('click',()=>showPanel(label,'<p>This storefront is a design demo. For store information, use the contact page.</p><a class="primary-button" href="contact.html" style="margin-top:24px">Contact us</a>'));p.replaceWith(button)});
const readMore=node('1:1210');if(readMore){readMore.tabIndex=0;readMore.role='button';readMore.addEventListener('click',()=>showPanel('Our approach','<p>Furniture designed around comfort, everyday living and timeless shapes.</p><p class="dialog-note">'+safe(node('1:1209').textContent)+'</p>'));readMore.addEventListener('keydown',e=>{if(e.key==='Enter')readMore.click()})}
$$('[data-section="Info block 4"] [data-name="Button"]').forEach(b=>{if(b.tagName!=='A'&&b.textContent.trim()==='Shop now')linkify(b,'shop.html')});
$$('[data-section="Hero"] [data-name="Card"]').forEach(c=>{if(c.textContent.includes('%'))return;c.tabIndex=0;c.role='button';c.setAttribute('aria-label','Explore furniture');c.addEventListener('click',()=>location.href='shop.html');c.addEventListener('keydown',e=>{if(e.key==='Enter')c.click()})});
let activeTab='All';
$$('[data-tab]').forEach(tab=>tab.addEventListener('click',()=>{activeTab=tab.dataset.tab;$$('[data-tab]').forEach(t=>t.setAttribute('aria-pressed',String(t===tab)));const section=$('[data-section="New products"]');let visible=0;$$('.product-card',section).forEach(c=>{const title=c.dataset.title;const match=activeTab==='All'||(activeTab==='Chairs'&&/chair/i.test(title))||(activeTab==='Armchairs'&&/armchair/i.test(title));c.hidden=!match;if(match)visible++});let empty=$('.result-empty',section);if(!empty){empty=document.createElement('p');empty.className='result-empty';empty.textContent='No new arrivals in this category yet. Explore the full collection in our shop.';section.append(empty)}empty.hidden=visible>0}));
function enhanceCatalog(){
 const area=node('1:622');if(!area)return;
 const results=node('1:853'),grid=node('1:861'),toolbar=node('1:854'),filters=node('1:623');results.classList.add('catalog-results');toolbar.classList.add('catalog-toolbar');grid.classList.add('catalog-grid');
 const cards=$$('.product-card',grid);cards.forEach((card,i)=>{
  const title=card.dataset.title;const category=/armchair/i.test(title)?'Armchairs':/chair|stool|chaise/i.test(title)?'Chairs':/table/i.test(title)?'Tables':/bed/i.test(title)?'Beds':/nightstand/i.test(title)?'Cabinets':'Decor';
  card.dataset.category=category;card.dataset.material=/table|nightstand/i.test(title)?'Wood':/chair|stool/i.test(title)?'Metal':'Leather';card.dataset.color=['Grey','Brown','White','Black','Blue','Green'][i%6];card.dataset.room=/bed|nightstand/i.test(title)?'Bedroom':/stool|white table/i.test(title)?'Kitchen':/classic chair/i.test(title)?'Hallway':'Living room';
 });
 const sortOld=node('1:856');const select=document.createElement('select');select.className='catalog-sort';select.setAttribute('aria-label','Sort products');select.innerHTML='<option value="latest">Sort by latest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name: A–Z</option>';sortOld.replaceWith(select);
 const count=node('1:855');count.setAttribute('role','status');
 const filterToggle=document.createElement('button');filterToggle.className='filter-toggle';filterToggle.textContent='Filters';filterToggle.setAttribute('aria-expanded','false');filterToggle.setAttribute('aria-controls','catalog-filters');filters.id='catalog-filters';area.prepend(filterToggle);filterToggle.addEventListener('click',()=>{filters.classList.toggle('open');filterToggle.setAttribute('aria-expanded',String(filters.classList.contains('open')))});
 const priceLine=node('1:626');const price=document.createElement('input');price.className='filter-price';price.type='range';price.min=0;price.max=9999;price.step=1;price.value=9999;price.setAttribute('aria-label','Maximum price');priceLine.replaceWith(price);
 const priceLabel=node('1:630');priceLabel.textContent='Price: $0 – $9999';
 const reset=document.createElement('button');reset.className='filter-reset';reset.textContent='Reset filters';filters.append(reset);
 const empty=document.createElement('p');empty.className='result-empty';empty.textContent='No products match your filters. Try another category or reset the filters.';empty.hidden=true;results.append(empty);
 const params=new URLSearchParams(location.search),q=(params.get('q')||'').toLowerCase(),category=params.get('category')||'',room=params.get('room')||'';
 const search=$('input[name=q]');if(search)search.value=params.get('q')||'';
 if(category)$$('input[name=categories]',filters).filter(c=>c.value===category).forEach(c=>c.checked=true);
 const brandLogos=$$('[data-name="Brands"]>div',filters);brandLogos.forEach((b,i)=>{b.role='button';b.tabIndex=0;b.setAttribute('aria-label','Filter by brand '+(i+1));b.setAttribute('aria-pressed','false');b.dataset.brand=String(i);b.style.cursor='pointer';b.addEventListener('click',()=>{b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true'));apply()});b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click()}})});
 let cleared=false;
 function apply(){
  const categories=$$('input[name=categories]:checked',filters).map(c=>c.value),colors=$$('input[name=color]:checked',filters).map(c=>c.value),materials=$$('input[name=masterial]:checked,input[name=material]:checked',filters).map(c=>c.value),brands=brandLogos.filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>Number(b.dataset.brand));
  let filtered=cards.filter((c,i)=>{
   const matchCategory=categories.length?categories.some(x=>x==='Sale'?c.textContent.toLowerCase().includes('sale'):x===c.dataset.category):!category||cleared||category==='Sale'&&c.textContent.toLowerCase().includes('sale')||c.dataset.category===category;
   return (cleared||!q||c.dataset.title.toLowerCase().includes(q))&&matchCategory&&(cleared||!room||c.dataset.room===room)&&Number(c.dataset.price)<=Number(price.value)&&(!colors.length||colors.includes(c.dataset.color))&&(!materials.length||materials.includes(c.dataset.material))&&(!brands.length||brands.includes(i%6));
  });
  if(select.value==='price-asc')filtered.sort((a,b)=>a.dataset.price-b.dataset.price);if(select.value==='price-desc')filtered.sort((a,b)=>b.dataset.price-a.dataset.price);if(select.value==='name')filtered.sort((a,b)=>a.dataset.title.localeCompare(b.dataset.title));
  cards.forEach(c=>c.hidden=true);filtered.forEach(c=>{c.hidden=false;grid.append(c)});count.textContent=filtered.length?`Showing 1–${filtered.length} of ${filtered.length} results`:'Showing 0 results';empty.hidden=filtered.length>0;priceLabel.textContent='Price: $0 – '+money(Number(price.value));
 }
 reset.addEventListener('click',()=>{cleared=true;$$('input[type=checkbox]',filters).forEach(c=>c.checked=false);brandLogos.forEach(b=>b.setAttribute('aria-pressed','false'));price.value=9999;select.value='latest';if(search)search.value='';history.replaceState(null,'',location.pathname);apply()});
 filters.addEventListener('change',apply);price.addEventListener('input',apply);select.addEventListener('change',apply);
 const paging=node('1:990');paging.className='pagination';paging.innerHTML='<div class="pages"><button aria-current="page" aria-label="Page 1">1</button></div><button disabled aria-label="All available products are shown" style="opacity:.45;cursor:default">Next ›</button>';
 apply();
}
enhanceCatalog();updateCounters();
fetch('products.json').then(r=>{if(!r.ok)throw Error('Product data unavailable');return r.json()}).then(data=>products=data).catch(()=>{products=$$('.product-card').map(fromCard)});
