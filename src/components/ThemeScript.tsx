export function ThemeScript() {
  const script = `(function(){try{var s=localStorage.getItem('sts-theme');if(s==='light'||s==='dark'){document.documentElement.setAttribute('data-theme',s)}else if(window.matchMedia('(prefers-color-scheme:light)').matches){document.documentElement.setAttribute('data-theme','light')}}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
