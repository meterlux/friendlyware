"""Build the site: joins head.html and src/*.js (build.py), then wraps it as index.html with the home-screen app bits."""
import subprocess, sys, os
here = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, '-I', os.path.join(here, 'build.py')], check=True, cwd=here)
body = open(os.path.join(here, 'out', 'index.html')).read()
head = ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png">'
        '<meta name="theme-color" content="#030302">\n')
tail = "<script>if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});</script>\n</html>\n"
open(os.path.join(here, 'index.html'), 'w').write(head + body + tail)
print('index.html', os.path.getsize(os.path.join(here, 'index.html')))
