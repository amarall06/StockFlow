import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import ts from 'typescript'
const code=ts.transpileModule(await readFile('src/lib/resume-refresh.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}}).outputText
const {startResumeRefresh}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
let online=false, timer, tick, calls=0, release
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{get onLine(){return online}}})
globalThis.document=Object.assign(new EventTarget(),{visibilityState:'visible'})
globalThis.window=Object.assign(new EventTarget(),{setTimeout:fn=>{timer=fn;return 1},clearTimeout:()=>{timer=undefined},setInterval:fn=>{tick=fn;return 2},clearInterval:()=>{tick=undefined}})
const applied=[]
const stop=startResumeRefresh({intervalMs:30000,load:()=>{calls++;return new Promise(resolve=>{release=resolve})},apply:value=>applied.push(value),onError:()=>assert.fail('Erro inesperado')})
tick();window.dispatchEvent(new Event('focus'));assert.equal(timer,undefined);assert.equal(calls,0)
online=true;window.dispatchEvent(new Event('online'));assert.equal(typeof timer,'function');timer();assert.equal(calls,1)
online=false;release(10);await new Promise(setImmediate);assert.deepEqual(applied,[])
online=true;window.dispatchEvent(new Event('online'));timer();release(20);await new Promise(setImmediate);assert.deepEqual(applied,[20])
stop();assert.equal(tick,undefined);assert.equal(timer,undefined)
console.log('5 casos novos aprovados: pausa offline, reconexão, descarte em desconexão, recuperação e limpeza.')
