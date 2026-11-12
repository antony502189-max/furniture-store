// Shared, validated configuration for the room and its tests. Units: metres, roubles.
export const slots = ['sofa', 'chair', 'table', 'storage', 'lamp'];
export const options = {
  sofa: ['sofa'], chair: ['modern-armchair', 'classic-armchair'],
  table: ['coffee-table'], storage: ['nightstand', 'sideboard'], lamp: ['floor-lamp']
};
export const layouts = {
  lounge: {sofa:[-.16,-1.47,0], chair:[-1.78,.12,0], table:[-.1,.3,0], storage:[2.1,-1.96,0], lamp:[-2.15,-1.6,0]},
  conversation: {sofa:[-.35,-1.47,0], chair:[1.6,.6,-1.0], table:[0,.15,0], storage:[2.1,-1.96,0], lamp:[-2.35,-1.55,0]},
  open: {sofa:[-1.95,-.45,Math.PI/2], chair:[1.5,1.2,-.5], table:[-.2,-.15,0], storage:[1.55,-1.96,0], lamp:[0,-1.9,0]}
};
export const defaults = {layout:'lounge',palette:'sage',floor:'oak',wall:'chalk',chair:'modern-armchair',storage:'nightstand',enabled:slots,night:false,budget:150000,positions:{}};
export function validate(raw={}) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw)) raw={};
  const pick=(key,allowed)=>allowed.includes(raw[key])?raw[key]:defaults[key];
  const state={layout:pick('layout',Object.keys(layouts)),palette:pick('palette',['sage','sand','clay']),floor:pick('floor',['oak','walnut','ash']),wall:pick('wall',['chalk','sage','clay']),chair:pick('chair',options.chair),storage:pick('storage',options.storage),enabled:Array.isArray(raw.enabled)?slots.filter(s=>raw.enabled.includes(s)):[...slots],night:raw.night===true,budget:Number.isFinite(raw.budget)?Math.max(60000,Math.min(220000,Math.round(raw.budget/1000)*1000)):defaults.budget,positions:{}};
  for(const slot of slots){const p=raw.positions?.[slot];if(Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))state.positions[slot]=[Math.max(-2.5,Math.min(2.5,p[0])),Math.max(-2,Math.min(2,p[1])),Math.max(-Math.PI*2,Math.min(Math.PI*2,p[2]))]}
  return state;
}
export const productId=(state,slot)=>slot==='chair'?state.chair:slot==='storage'?state.storage:options[slot][0];
export const position=(state,slot)=>state.positions[slot]||layouts[state.layout][slot];
export const selection=(state,products)=>slots.filter(s=>state.enabled.includes(s)).map(s=>products.find(p=>p.id===productId(state,s))).filter(Boolean);
export const total=(state,products)=>selection(state,products).reduce((sum,p)=>sum+p.price,0);
export function encode(state){return encodeURIComponent(JSON.stringify(validate(state)))}
export function decode(text){try{return validate(JSON.parse(decodeURIComponent(text)))}catch{return validate()}}
