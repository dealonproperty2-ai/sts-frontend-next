export function ThemeScript() {
  const script = `(function(){try{var s=localStorage.getItem('sts-theme');document.documentElement.setAttribute('data-theme',(s==='light'||s==='dark')?s:'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
