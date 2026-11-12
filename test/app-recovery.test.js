import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../public/app-recovery.js',import.meta.url),'utf8');
function browser({href='https://www.altairesports.com/tr?tab=matches#results',stored='',blocked=false,online=true}={}){
 const events={},navigations=[],panels=[];
 const location=new URL(href);
 location.replace=url=>navigations.push(url);
 const element=()=>({style:{},setAttribute(){},addEventListener(){},append(){},remove(){}});
 const document={body:{append:node=>panels.push(node)},getElementById:()=>null,createElement:element};
 const storage={getItem(){if(blocked)throw Error('blocked');return stored;},setItem(_key,value){if(blocked)throw Error('blocked');stored=value;}};
 const window={location,addEventListener:(name,fn)=>{events[name]=fn;},history:{state:{},replaceState(_state,_unused,url){location.href=url;}}};
 vm.runInNewContext(source,{window,document,navigator:{onLine:online},sessionStorage:storage,URL,Date});
 return {events,navigations,panels,location,stored:()=>stored};
}
const missingScript={target:{tagName:'SCRIPT',src:'https://www.altairesports.com/assets/index-old1234.js'}};

test('entry module failure reloads once and preserves route, query and hash',()=>{
 const b=browser();b.events.error(missingScript);b.events.error(missingScript);
 assert.equal(b.navigations.length,1);
 const url=new URL(b.navigations[0]);
 assert.equal(url.pathname,'/tr');assert.equal(url.searchParams.get('tab'),'matches');assert.equal(url.hash,'#results');
 assert.ok(Number(url.searchParams.get('__altair_reload'))>0);
 assert.equal(b.stored(),url.searchParams.get('__altair_reload'));
});
test('preload failures use the same guard and do not loop after a failed retry',()=>{
 const b=browser();let prevented=false;
 b.events['vite:preloadError']({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(b.navigations.length,1);
 const next=browser({href:b.navigations[0],stored:b.stored()});next.events.error(missingScript);
 assert.equal(next.navigations.length,0);assert.equal(next.panels[0].id,'altair-load-error');
});
test('blocked storage retains the URL guard even when the app entry starts',()=>{
 const b=browser({blocked:true});b.events.error(missingScript);
 const next=browser({href:b.navigations[0],blocked:true});next.events['altair:app-ready']();next.events.error(missingScript);
 assert.equal(next.navigations.length,0);assert.equal(next.panels.length,1);
});
test('offline failures show a retry action without automatic navigation',()=>{
 const b=browser({online:false});b.events.error(missingScript);
 assert.equal(b.navigations.length,0);assert.equal(b.panels.length,1);
});
test('unrelated scripts, images and ordinary JS exceptions do not reload the app',()=>{
 const b=browser();
 for(const target of [{tagName:'IMG',src:'/logo-ui.png'},{tagName:'SCRIPT',src:'https://external.example/assets/script.js'},{tagName:'SCRIPT',src:'/analytics.js'},{}])b.events.error({target});
 assert.equal(b.navigations.length,0);assert.equal(b.panels.length,0);
});
test('successful startup removes only the recovery query while retaining the loop guard',()=>{
 const stamp=String(Date.now());const b=browser({href:`https://www.altairesports.com/tr?tab=matches&__altair_reload=${stamp}#results`,stored:stamp});
 b.events['altair:app-ready']();assert.equal(b.location.href,'https://www.altairesports.com/tr?tab=matches#results');assert.equal(b.stored(),stamp);
});
