const fs=require('fs'),path=require('path');
eval(fs.readFileSync(__dirname+'/build.js','utf8'));
const map=p=>p.startsWith('export/lot2/src/')?path.join(__dirname,path.basename(p)):path.join(__dirname,'out',p.replace('export/lot2/',''));
buildLot2({readFile:async p=>fs.readFileSync(map(p),'utf8'),saveFile:async(p,c)=>{const f=map(p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,c);},log:(...a)=>console.log(...a)}).catch(e=>{console.error(e);process.exit(1)});
