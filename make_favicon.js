const fs=require('fs'),zlib=require('zlib');
const CRC=(()=>{const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c}return t})();
function c32(b){let c=~0;for(let i=0;i<b.length;i++)c=(c>>>8)^CRC[(c^b[i])&255];return ~c}
function ch(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(c32(td)>>>0);return Buffer.concat([l,td,c])}
function png(w,h,px){const raw=Buffer.alloc((w*4+1)*h);for(let y=0;y<h;y++){raw[y*(w*4+1)]=0;px.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4)}const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),ch('IHDR',ih),ch('IDAT',zlib.deflateSync(raw,{level:9})),ch('IEND',Buffer.alloc(0))])}
function draw(N){const B=Buffer.alloc(N*N*4);const C=N/2;
 const set=(x,y,r,g,b,a)=>{const i=(y*N+x)*4;if(a>=1){B[i]=r;B[i+1]=g;B[i+2]=b;B[i+3]=255}else if(a>0){B[i]=Math.round(B[i]*(1-a)+r*a);B[i+1]=Math.round(B[i+1]*(1-a)+g*a);B[i+2]=Math.round(B[i+2]*(1-a)+b*a);B[i+3]=255}};
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const d=Math.sqrt((x-C)**2+(y-C)**2)/(0.48*N);
  if(d>1)continue;
  const aa=1-Math.max(0,d-0.94)/0.06;
  set(x,y,11,14,20,aa);
  if(d>0.88)set(x,y,245,158,11,aa*0.85);
  if(x>C-0.20*N&&x<C+0.20*N&&y>C-0.22*N&&y<C-0.095*N)set(x,y,245,158,11,aa);
  if(x>C-0.055*N&&x<C+0.055*N&&y>=C-0.095*N&&y<C+0.17*N)set(x,y,245,158,11,aa);
  if(x>C-0.13*N&&x<C+0.13*N&&y>C+0.21*N&&y<C+0.27*N)set(x,y,56,189,248,aa);
 }return B}
function ico(pairs){const dir=Buffer.alloc(6+pairs.length*12);dir.writeUInt16LE(0,0);dir.writeUInt16LE(1,2);dir.writeUInt16LE(pairs.length,4);let off=6;pairs.forEach((p,i)=>{const s=p[0];dir[i*12]=s===256?0:s;dir[i*12+1]=s===256?0:s;dir.writeUInt16LE(p[1].length,off+4);dir.writeUInt32LE(22+off,off+8);off+=12});return Buffer.concat([dir,...pairs.map(p=>p[1])])}
fs.mkdirSync('tmp',{recursive:true});
fs.copyFileSync('apple-touch-icon.png','tmp/apple-touch-icon.old.png');
const i32=png(32,32,draw(32)),i48=png(48,48,draw(48)),i256=png(256,256,draw(256));
fs.writeFileSync('favicon.ico',ico([[32,i32],[48,i48],[256,i256]]));
fs.writeFileSync('apple-touch-icon.png',i256);
console.log('favicon.ico:',fs.statSync('favicon.ico').size,'B (32+48+256) | apple-touch-icon.png:',fs.statSync('apple-touch-icon.png').size,'B (256x256)');
