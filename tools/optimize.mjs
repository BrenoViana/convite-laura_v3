import fs from "fs";
import path from "path";
import sharp from "sharp";

const photosDir = "src/assets/photos";
const widths = [1280, 960, 640];

// pega originais (ignora placeholder e derivados)
const all = fs.readdirSync(photosDir)
  .filter(n => /\.(jpe?g|png|webp|avif)$/i.test(n))
  .filter(n => !/^placeholder\./i.test(n))
  .filter(n => !/-((640|960|1280))\.(webp|avif)$/i.test(n));

function sortKey(name){
  const m = name.match(/^\D*(\d{1,4})/);
  return m ? parseInt(m[1],10) : Number.MAX_SAFE_INTEGER;
}
all.sort((a,b)=> sortKey(a)-sortKey(b) || a.localeCompare(b));

// garantir enumerados base (01.webp, 02.webp, ...)
let next = 1;
const pad2 = (n)=> String(n).padStart(2,"0");
const enumerated = [];

for(const name of all){
  // se já for NN.webp, mantém; caso contrário, converte
  if(/^\d{2}\.webp$/i.test(name)){
    enumerated.push(name);
    continue;
  }
  while(fs.existsSync(path.join(photosDir, `${pad2(next)}.webp`))) next++;
  const outBase = `${pad2(next)}.webp`;
  const inFile = path.join(photosDir, name);
  const outFile = path.join(photosDir, outBase);

  await sharp(inFile).webp({ quality: 82, effort: 4 }).toFile(outFile);
  enumerated.push(outBase);
  next++;
}

// gerar derivados WEBP/AVIF
for(const base of enumerated){
  const abs = path.join(photosDir, base);
  const stem = base.replace(/\.webp$/i,"");
  for(const w of widths){
    const outWebp = path.join(photosDir, `${stem}-${w}.webp`);
    const outAvif = path.join(photosDir, `${stem}-${w}.avif`);
    if(!fs.existsSync(outWebp)){
      await sharp(abs).resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 }).toFile(outWebp);
      console.log("WEBP:", path.basename(outWebp));
    }
    if(!fs.existsSync(outAvif)){
      await sharp(abs).resize({ width: w, withoutEnlargement: true })
        .avif({ quality: 50, effort: 3 }).toFile(outAvif);
      console.log("AVIF:", path.basename(outAvif));
    }
  }
}

console.log("\\nOK: Enumerados e derivados prontos.");
