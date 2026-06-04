import http from 'node:http';
function gj(p){return new Promise((res,rej)=>{http.get('http://localhost:9233'+p,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej);});}
const tgt=(await gj('/json')).find(x=>x.type==='page'); const sock=new WebSocket(tgt.webSocketDebuggerUrl);
let id=0;const pend=new Map();const logs=[];
function send(m,p={}){return new Promise(r=>{const i=++id;pend.set(i,r);sock.send(JSON.stringify({id:i,method:m,params:p}));});}
sock.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}
 if(m.method==='Runtime.exceptionThrown')logs.push('EXC: '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text).slice(0,200));});
await new Promise(r=>sock.addEventListener('open',r)); await send('Page.enable'); await send('Runtime.enable');
async function go(u){await send('Page.navigate',{url:u});await new Promise(r=>{const h=e=>{const m=JSON.parse(e.data);if(m.method==='Page.loadEventFired'){sock.removeEventListener('message',h);r();}};sock.addEventListener('message',h);});}
async function ev(x){const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});return r.result.value;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
await go('http://localhost:3104/'); await sleep(3000);
const r = await ev(`(()=>({url:location.pathname, has404: document.body.innerText.includes("didn't ship")||document.body.innerText.includes('404'), hasHero: document.body.innerText.includes('discovery call')||!!document.querySelector('.hero-stage'), navActive: [...document.querySelectorAll('nav a')].filter(a=>a.querySelector('span')||getComputedStyle(a).fontWeight>=500).map(a=>a.textContent.trim())}))()`);
console.log('HOME (/):', JSON.stringify(r));
console.log('exceptions:', logs.slice(0,3));
sock.close();process.exit(0);
