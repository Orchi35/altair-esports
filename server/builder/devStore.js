import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises'
import {dirname,resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {MAX_BODY_BYTES,RATE_SCRIPT} from './service.js'

const queues=new Map()
const buildKey=/^altair:builder:v1:build:[A-Za-z0-9_-]{12}$/
const rateKey=/^altair:builder:v1:rate:/

// Development-only Redis command adapter. No production handler imports it.
// Serialize all adapters for the same path in this process; reread on every
// data operation so a fresh adapter sees persisted updates and corruption.
export function createLocalBuilderStore({filePath,now=Date.now}) {
  const file=resolve(filePath),rates=new Map()
  async function load() {
    let text
    try {text=await readFile(file,'utf8')} catch(error) {if(error.code==='ENOENT')return {version:1,builds:{}};throw error}
    const data=JSON.parse(text)
    if(!data||data.version!==1||!data.builds||typeof data.builds!=='object'||Array.isArray(data.builds)||Object.entries(data.builds).some(([key,value])=>!buildKey.test(key)||typeof value!=='string'||Buffer.byteLength(value)>MAX_BODY_BYTES))throw new Error('Invalid local build store')
    return data
  }
  async function save(data) {
    await mkdir(dirname(file),{recursive:true})
    const temporary=`${file}.${randomUUID()}.tmp.local`
    try {
      await writeFile(temporary,JSON.stringify(data),{flag:'wx',mode:0o600})
      await rename(temporary,file)
    } catch(error) {
      // Preserve the write failure even if best-effort temporary cleanup fails.
      await unlink(temporary).catch(()=>{})
      throw error
    }
  }
  async function execute([operation,...args]) {
    if(operation==='EVAL') {
      const [script,count,...parts]=args
      if(script!==RATE_SCRIPT||!Number.isInteger(count)||count<1||parts.length!==count*3)throw new Error('Unsupported local rate operation')
      const keys=parts.slice(0,count),values=parts.slice(count)
      for(let i=0;i<count;i++) {
        const maximum=Number(values[i*2]),seconds=Number(values[i*2+1])
        if(!rateKey.test(keys[i])||!Number.isInteger(maximum)||maximum<1||!Number.isInteger(seconds)||seconds<1)throw new Error('Invalid local rate operation')
      }
      const timestamp=now()
      for(let i=0;i<count;i++) {
        const key=keys[i],prior=rates.get(key)
        const bucket=prior&&prior.expiresAt>timestamp?prior:{count:0,expiresAt:timestamp+Number(values[i*2+1])*1000}
        bucket.count++;rates.set(key,bucket)
        if(bucket.count>Number(values[i*2]))return i+1
      }
      return 0
    }
    const [key,value,condition]=args
    if(!buildKey.test(key))throw new Error('Unsupported local build key')
    if(operation==='GET'&&args.length===1)return (await load()).builds[key]??null
    if(operation==='SET'&&args.length===3&&condition==='NX'&&typeof value==='string'&&Buffer.byteLength(value)<=MAX_BODY_BYTES) {
      const data=await load()
      if(Object.hasOwn(data.builds,key))return null
      data.builds[key]=value
      await save(data)
      return 'OK'
    }
    throw new Error('Unsupported local build operation')
  }
  return args=>{
    const previous=queues.get(file)||Promise.resolve()
    const result=previous.catch(()=>{}).then(()=>execute(args))
    queues.set(file,result)
    void result.finally(()=>{if(queues.get(file)===result)queues.delete(file)}).catch(()=>{})
    return result
  }
}
