import http.server
import functools

ROOT = '/Users/usmaninayat/Documents/GitHub/Claude'

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
httpd = http.server.HTTPServer(('127.0.0.1', 8765), Handler)
print('Serving %s at http://127.0.0.1:8765' % ROOT, flush=True)
httpd.serve_forever()
