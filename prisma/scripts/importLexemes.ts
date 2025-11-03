import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
const prisma=new PrismaClient();

type Mode="update-missing"|"overwrite";
const nonEmpty=(s?:string|null)=>s!==undefined && s!==null && String(s).trim()!=="";

function args(){const a=process.argv.slice(2), o:any={};
  for(let i=0;i<a.length;i++){const s=a[i]; if(s.startsWith("--")){
    const [k,v]=s.includes("=")?s.split("=",2):[s,a[i+1]]; o[k.slice(2)]=v; if(!s.includes("=")) i++;}}
  return o as {lex:string; tr?:string; mode?:Mode};
}
function splitCSVLine(line:string){const out:string[]=[]; let cur="", inQ=false;
  for(let i=0;i<line.length;i++){const c=line[i];
    if(inQ){ if(c=='"'&&line[i+1]=='"'){cur+='"'; i++;} else if(c=='"'){inQ=false;} else cur+=c; }
    else { if(c=='"'){inQ=true;} else if(c===","){out.push(cur); cur="";} else cur+=c; } }
  out.push(cur); return out;
}
function readCSV(file:string){const txt=fs.readFileSync(file,"utf8").replace(/\r/g,"");
  const lines=txt.split("\n").filter(Boolean); const headers=(lines[0]||"").split(",").map(h=>h.trim());
  const rows:Record<string,string>[]=[]; for(let i=1;i<lines.length;i++){const cols=splitCSVLine(lines[i]); const r:Record<string,string>={};
    headers.forEach((h,idx)=>r[h]=cols[idx]??""); rows.push(r);} return {headers,rows};}

async function upsertLex(row:Record<string,string>, mode:Mode){
  const lemma=row.lemma?.trim(); const pos=row.pos?.trim(); if(!lemma||!pos) return;
  const existing=await prisma.lexeme.findUnique({where:{lemma_pos:{lemma,pos}}});
  const patch:any={}; const set=(k:keyof typeof patch, v?:string)=>{ if(!nonEmpty(v)) return; if(mode==="overwrite"||!(existing as any)?.[k]) patch[k]=v; };

  set("definition",row.definition); set("ipa",row.ipa);
  set("audioUrlUS",row.audioUrlUS); set("audioUrlUK",row.audioUrlUK);
  set("cefr",row.cefr); set("frequency",row.frequency);
  set("etymology",row.etymology); set("notes",row.notes);

  if(nonEmpty(row.forms_json)){ try{ const o=JSON.parse(row.forms_json!);
    if(mode==="overwrite"||!existing?.forms) patch.forms=o; }catch{} }
  if(nonEmpty(row.collocations_json)){ try{ const a=JSON.parse(row.collocations_json!);
    if(Array.isArray(a) && (mode==="overwrite"||!existing?.collocations)) patch.collocations=a as any; }catch{} }

  if(existing){
    if(Object.keys(patch).length) await prisma.lexeme.update({where:{lemma_pos:{lemma,pos}}, data:patch});
  }else{
    await prisma.lexeme.create({data:{
      lemma,pos, definition:row.definition??"", ipa:row.ipa||null,
      audioUrlUS:row.audioUrlUS||null, audioUrlUK:row.audioUrlUK||null,
      cefr:row.cefr||null, frequency:row.frequency||null, etymology:row.etymology||null, notes:row.notes||null,
      forms: nonEmpty(row.forms_json)?(JSON.parse(row.forms_json!) as any):Prisma.DbNull,
      collocations: nonEmpty(row.collocations_json)?(JSON.parse(row.collocations_json!) as any):Prisma.DbNull,
    }});
  }
}

async function upsertTr(row:Record<string,string>){
  const lemma=row.lemma?.trim(), pos=row.pos?.trim(), lang=row.lang?.trim(); const text=row.text??"";
  if(!lemma||!pos||!lang) return;
  const lex=await prisma.lexeme.findUnique({where:{lemma_pos:{lemma,pos}}, select:{id:true}});
  if(!lex) return;
  await prisma.translation.upsert({
    where:{lexemeId_lang:{lexemeId:lex.id, lang}},
    update:{text}, create:{lexemeId:lex.id, lang, text},
  });
}

async function main(){
  const {lex,tr,mode="update-missing"}=args(); if(!lex){console.error("--lex is required"); process.exit(1);}
  const {rows}=readCSV(lex); let n=0;
  for(const r of rows){ await upsertLex(r, (mode as Mode)||"update-missing"); if(++n%500===0) console.log("lexemes:",n); }
  if(tr){ const {rows:trs}=readCSV(tr); let m=0; for(const r of trs){ await upsertTr(r); if(++m%500===0) console.log("translations:",m); } }
  console.log("Import done.");
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
