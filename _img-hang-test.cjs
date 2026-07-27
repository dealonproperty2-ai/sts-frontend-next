const React = require('react'); const fs = require('fs'); const path = require('path');
const RP = require(path.join(process.cwd(),'node_modules/@react-pdf/renderer/lib/react-pdf.browser.js'));
const { pdf, Document, Page, Text, View, Image } = RP;
const h = React.createElement;
const logo = 'data:image/png;base64,' + fs.readFileSync('public/logo3.png').toString('base64');

function test(label, doc) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { console.log(`  [${label}] HUNG >8s`); resolve('hang'); }, 8000);
    pdf(doc).toBlob().then(b => { clearTimeout(t); console.log(`  [${label}] OK size=${b&&b.size}`); resolve('ok'); })
      .catch(e => { clearTimeout(t); console.log(`  [${label}] REJECT: ${e&&e.message}`); resolve('reject'); });
  });
}

(async () => {
  // A: fixed header with Image(logo) + fixed footer with render callback (mirrors real doc)
  await test('logo+fixed+render', h(Document,{},
    h(Page,{size:'A4',style:{paddingTop:96,paddingBottom:58,paddingHorizontal:42}},
      h(View,{style:{position:'absolute',top:0,left:0,right:0,paddingTop:26,paddingHorizontal:42},fixed:true},
        h(Image,{src:logo,style:{width:34,height:34,objectFit:'contain'}}),
        h(Text,{style:{fontSize:13}},'STEP TO SOFT')),
      h(Text,{},'Body content here'),
      h(View,{style:{position:'absolute',bottom:22,left:42,right:42},fixed:true},
        h(Text,{style:{fontSize:7},render:({pageNumber,totalPages})=>`Page ${pageNumber} / ${totalPages}`})))));
  // B: invalid image data URI (does react-pdf hang on bad image?)
  await test('bad-image', h(Document,{},
    h(Page,{size:'A4'}, h(Image,{src:'data:image/png;base64,ZZZZnotarealpng',style:{width:20,height:20}}))));
  // C: image via http URL (network) -- simulate what a non-dataURI would do
  await test('no-image-baseline', h(Document,{}, h(Page,{size:'A4'}, h(Text,{},'x'))));
})();
