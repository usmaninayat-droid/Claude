import http.server, os, sys
os.chdir('/Users/apple/Desktop/Claude')
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
http.server.HTTPServer(('127.0.0.1', 8766), H).serve_forever()
