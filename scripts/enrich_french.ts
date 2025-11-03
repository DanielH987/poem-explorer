import fs from "fs";
import readline from "readline";
import zlib from "zlib";
import { Readable } from "stream";

type Row = Record<string,string>;
type Mode = "update-missing"|"overwrite";

const esc = (s:string)=>/[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
const nonEmpty = (s?:string|null)=>s!==undefined && s!==null && String(s).trim()!=="";

function args(){
  const a=process.argv.slice(2), o:any={};
  for(let i=0;i<a.length;i++){const s=a[i];
    if(s.startsWith("--")){
      const [k,v]=s.includes("=")?s.split("=",2):[s,a[i+1]];
      o[k.slice(2)]=v; if(!s.includes("=")) i++;
    }
  }
  return o as {in:string;out:string;tr?:string;wiktextract:string;lexique?:string;mode?:Mode};
}

function splitCSVLine(line:string){
  const out:string[]=[]; let cur="", inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(inQ){
      if(c=='"' && line[i+1]=='"'){cur+='"'; i++;}
      else if(c=='"'){inQ=false;} else cur+=c;
    }else{
      if(c=='"'){inQ=true;}
      else if(c===","){out.push(cur); cur="";}
      else cur+=c;
    }
  }
  out.push(cur); return out;
}
function readCSV(file:string){const txt=fs.readFileSync(file,"utf8").replace(/\r/g,"");
  const lines=txt.split("\n").filter(Boolean); const headers=(lines[0]||"").split(",").map(h=>h.trim());
  const rows:Row[]=[]; for(let i=1;i<lines.length;i++){const cols=splitCSVLine(lines[i]); const r:Row={};
    headers.forEach((h,idx)=>r[h]=cols[idx]??""); rows.push(r);} return {headers,rows};
}
function writeCSV(headers:string[], rows:Row[], file:string){
  const out=[headers.join(",")]; for(const r of rows){out.push(headers.map(h=>esc(r[h]??"")).join(","));}
  fs.writeFileSync(file,out.join("\n"),"utf8");
}
function mapPosToWT(pos:string){
  const p=pos.toUpperCase();
  if(p==="NOUN"||p==="PROPN") return "noun";
  if(p==="VERB"||p==="AUX")  return "verb";
  if(p==="ADJ")              return "adjective";
  if(p==="ADV")              return "adverb";
  if(p==="PRON")             return "pronoun";
  if(p==="DET")              return "determiner";
  if(p==="ADP")              return "preposition";
  if(p==="NUM")              return "numeral";
  if(p==="INTJ")             return "interjection";
  if(p==="PART")             return "particle";
  if(p==="CONJ"||p==="CCONJ"||p==="SCONJ") return "conjunction";
  return "";
}
function commonsFilePathURL(filename:string){
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}
type WTEntry = {
  word?: string;
  lang_code?: string;
  pos?: string;
  senses?: { glosses?: string[]; examples?: { text?: string }[] }[];
  sounds?: { ipa?: string; mp3_url?: string; ogg_url?: string }[];
  etymology_texts?: string[];
  translations?: { lang_code?: string; word?: string }[];
};

function openMaybeGzip(filePath: string): Readable {
  const s = fs.createReadStream(filePath);
  return filePath.endsWith(".gz") ? s.pipe(zlib.createGunzip()) : s;
}

async function loadWiktextractSubset(jsonlPath: string, targets: Set<string>) {
  const byLemma = new Map<string, WTEntry[]>();
  const rl = readline.createInterface({ input: openMaybeGzip(jsonlPath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    let obj: WTEntry | null = null;
    try { obj = JSON.parse(line); } catch { continue; }
    if (!obj || obj.lang_code !== "fr") continue;
    const lem = (obj.word || "").toLowerCase();
    if (!lem || !targets.has(lem)) continue;
    const arr = byLemma.get(lem) || [];
    arr.push(obj);
    byLemma.set(lem, arr);
  }
  return byLemma;
}
function pickBestWT(list:WTEntry[], wantPos:string){
  if(!list?.length) return null;
  const exact=list.filter(e=>!wantPos||e.pos===wantPos).sort((a,b)=>(b.senses?.length||0)-(a.senses?.length||0));
  return exact[0] ?? list.sort((a,b)=>(b.senses?.length||0)-(a.senses?.length||0))[0];
}
export function loadLexiqueFreq(csvPath?: string) {
  const m = new Map<string, number>();
  if (!csvPath || !fs.existsSync(csvPath)) return m;
  const raw = fs.readFileSync(csvPath, "utf8").replace(/\r/g, "");
  const lines = raw.split("\n").filter(Boolean);
  if (!lines.length) return m;

  const header = lines[0];
  // auto-detect delimiter; your sample shows comma
  const delim = header.includes(";") ? ";" : header.includes("\t") ? "\t" : ",";

  const head = header.split(delim).map(h => h.trim().toLowerCase());

  // fuzzy match
  const iLemme = head.findIndex(h => h.includes("lemme"));
  // prefer freqlivres, otherwise freqfilms2
  let iFreq = head.findIndex(h => h.includes("freqlivres"));
  if (iFreq < 0) iFreq = head.findIndex(h => h.includes("freqfilms2"));

  if (iLemme < 0 || iFreq < 0) return m;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim);
    const lem = (cols[iLemme] || "").toLowerCase();
    const v = Number((cols[iFreq] || "0").replace(",", ".")); // just in case
    if (lem) m.set(lem, (m.get(lem) || 0) + (isFinite(v) ? v : 0));
  }
  return m;
}
function bucket(v?:number|null){ if(!v||isNaN(v)) return null; if(v>=50) return "high"; if(v>=10) return "medium"; return "low"; }
function firstGloss(e?: WTEntry) {
  return e?.senses?.find(s => s.glosses && s.glosses.length)?.glosses?.[0] ?? "";
}

function firstExample(e?: WTEntry) {
  const ex = e?.senses?.find(s => s.examples && s.examples.length)?.examples?.[0]?.text;
  return ex ? { text: ex } : undefined;
}

function firstIPA(e?: WTEntry) {
  return e?.sounds?.find(s => s.ipa)?.ipa;
}

function firstMP3(e?: WTEntry) {
  // Prefer mp3_url; ogg_url as fallback if you want
  return e?.sounds?.find(s => s.mp3_url)?.mp3_url;
}

function firstEtym(e?: WTEntry) {
  return e?.etymology_texts?.[0];
}
async function main(){
  const {in:inPath,out:outPath,tr:trPath,wiktextract,lexique,mode="update-missing"}=args();
  if(!inPath||!outPath||!wiktextract){console.error("Usage: tsx scripts/enrich_french.ts --in=lexemes.csv --out=lexemes_enriched.csv --tr=lexeme_translations.csv --wiktextract=data/wiktextract-fr.jsonl [--lexique=data/Lexique383.csv] [--mode=update-missing|overwrite]"); process.exit(1);}

  const {headers,rows}=readCSV(inPath);
  const need=["id","lemma","pos","definition","ipa","audioUrlUS","audioUrlUK","cefr","frequency","etymology","notes","forms_json","collocations_json"];
  const finalHeaders=Array.from(new Set([...headers,...need]));

  const targets=new Set(rows.map(r=>(r.lemma||"").toLowerCase()).filter(Boolean));
  console.log("Loading Wiktextract subset…");
  const wt=await loadWiktextractSubset(wiktextract,targets);
  console.log("WT lemmas:",wt.size);
  const freq=loadLexiqueFreq(lexique);
  console.log("Lexique entries:",freq.size);

  const outRows:Row[]=[]; const trRows:{lemma:string;pos:string;lang:string;text:string}[]=[];
  for(const r of rows){
    const lemma=(r.lemma||"").trim(), pos=(r.pos||"").trim(); const ll=lemma.toLowerCase();
    const want=mapPosToWT(pos); const best=pickBestWT(wt.get(ll)||[], want);

    const m=(mode as Mode)||"update-missing"; const allow=(has:boolean)=>m==="overwrite"||!has;

    if (best) {
      const gloss = firstGloss(best);
      if (allow(nonEmpty(r.definition))) r.definition = gloss;

      const ipa = firstIPA(best);
      if (ipa && allow(nonEmpty(r.ipa))) r.ipa = ipa;

      const mp3 = firstMP3(best);
      if (mp3 && allow(nonEmpty(r.audioUrlUS))) r.audioUrlUS = mp3; // direct URL is fine

      const ety = firstEtym(best);
      if (ety && allow(nonEmpty(r.etymology))) r.etymology = ety;

      // Optional: add an example to a separate CSV if you want later.

      // Translations
      if (best.translations && trPath) {
        for (const t of best.translations) {
          const lang = (t.lang_code || "").toLowerCase();
          const text = (t.word || "").trim();
          if (lang && text) trRows.push({ lemma, pos, lang, text });
        }
      }
    }
    if(allow(nonEmpty(r.frequency))){
      const f=freq.get(ll); const b=bucket(f); if(b) r.frequency=b;
    }
    outRows.push(r);
  }

  writeCSV(finalHeaders,outRows,outPath);
  if(trPath){ const rows2=trRows.map(x=>({lemma:x.lemma,pos:x.pos,lang:x.lang,text:x.text}));
    writeCSV(["lemma","pos","lang","text"], rows2, trPath); }

  console.log("Enrichment done.");
}
main().catch(e=>{console.error(e);process.exit(1);});
