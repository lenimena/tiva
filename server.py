#!/usr/bin/env python3
import json, os, sqlite3, mimetypes, hashlib, secrets, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

ROOT=os.path.dirname(os.path.abspath(__file__))
DB=os.path.join(ROOT,'prestadores_v9.db')
PORT=int(os.environ.get('PORT','8000'))
SESSIONS={}
RECEIPTS_DIR=os.path.join(ROOT,'receipts')
os.makedirs(RECEIPTS_DIR, exist_ok=True)
ADMIN_USER=os.environ.get('PRESTADORES_ADMIN_USER','admin')
ADMIN_PASSWORD=os.environ.get('PRESTADORES_ADMIN_PASSWORD','Admin123!')
SERVICES=['Aire acondicionado','Albañilería','Animación de eventos','Armado de muebles','Asesoría contable','Asesoría jurídica','Asesoría informática','Asistencia virtual','Barbería a domicilio','Cuidado de adultos mayores','Cuidado de mascotas','Cuidado de niños','Cerrajería','Clases de idiomas','Clases de música','Clases de matemáticas','Clases de refuerzo escolar','Coaching personal','Community manager','Confección de ropa','Construcción','Consultoría empresarial','Cocina a domicilio','Decoración de eventos','Diseño gráfico','Diseño web','Electricidad','Enfermería a domicilio','Entrenador personal','Estilismo','Fotografía','Fumigación','Gasfitería / plomería','Gestión de redes sociales','Instalación de cámaras','Instalación de pisos','Instalación de vidrios','Instalación de drywall','Instalación de internet','Jardinería','Lavado de autos','Lavado de muebles','Lavandería','Limpieza de casas','Limpieza de oficinas','Limpieza de vidrios','Manicure y pedicure','Maquillaje profesional','Masajes','Mantenimiento de computadores','Mantenimiento de celulares','Mantenimiento de electrodomésticos','Mantenimiento de piscinas','Mantenimiento de motos','Mantenimiento de bicicletas','Mantenimiento de aires acondicionados','Mensajería','Mudanzas','Niñera','Nutrición','Organización de eventos','Organización de espacios','Panadería y repostería','Peluquería a domicilio','Pintura de interiores','Pintura de exteriores','Plomería','Podología','Reparación de calzado','Reparación de electrodomésticos','Reparación de computadores','Reparación de celulares','Reparación de muebles','Reparación de motos','Reparación de bicicletas','Reparación de puertas','Reparación de ventanas','Reparación de lavadoras','Reparación de neveras','Reparación de televisores','Reparación de ventiladores','Reparación de herramientas','Reparación de instrumentos musicales','Reparación de relojes','Reparación de joyería','Secretaría / digitación','Seguridad privada','Servicio de catering','Servicio de mesero','Soporte técnico','Tapicería','Tatuaje y piercing','Traducción','Transporte particular','Transporte de carga','Tutorías académicas','Venta de comida preparada','Video y edición','Visagismo de cejas','Costura y arreglos']

def db():
    c=sqlite3.connect(DB)
    c.row_factory=sqlite3.Row
    return c

def init():
    c=db(); c.executescript('''
    CREATE TABLE IF NOT EXISTS providers(id INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS applications(id INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS renewals(id INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    ''')
    for i,s in enumerate(SERVICES,1): c.execute('INSERT OR IGNORE INTO services(id,name) VALUES(?,?)',(i,s))
    c.commit(); c.close()

def rows(table):
    c=db(); out=[json.loads(r['data']) for r in c.execute(f'SELECT data FROM {table} ORDER BY id')]; c.close(); return out

def replace(table, items):
    c=db(); c.execute(f'DELETE FROM {table}')
    for i,item in enumerate(items,1):
        ident=int(item.get('id',i))
        try: ident=int(ident)
        except: ident=i
        c.execute(f'INSERT OR REPLACE INTO {table}(id,data) VALUES(?,?)',(ident,json.dumps(item,ensure_ascii=False)))
    c.commit(); c.close()

def state():
    return {'data':rows('providers'),'applications':rows('applications'),'renewals':rows('renewals'),'events':rows('events'),'notifications':rows('notifications'),'services':[r['name'] for r in db().execute('SELECT name FROM services ORDER BY id')]}

def is_admin(handler):
    cookie=handler.headers.get('Cookie','')
    token=None
    for part in cookie.split(';'):
        part=part.strip()
        if part.startswith('prestadores_session='):
            token=part.split('=',1)[1]
    if token and token in SESSIONS and SESSIONS[token] > time.time():
        return True
    return False

def require_admin(handler):
    if not is_admin(handler):
        handler.send_json({'error':'No autorizado'},401)
        return False
    return True

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        # always serve from project root
        path=urlparse(path).path
        if path=='/': path='/index.html'
        path=path.split('?',1)[0]
        rel=os.path.normpath(path.lstrip('/'))
        full=os.path.join(ROOT,rel)
        if not full.startswith(ROOT): return os.path.join(ROOT,'index.html')
        return full
    def send_json(self,obj,status=200):
        raw=json.dumps(obj,ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(raw))); self.send_header('Access-Control-Allow-Origin','*'); self.end_headers(); self.wfile.write(raw)
    def do_OPTIONS(self):
        self.send_response(204); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','Content-Type'); self.send_header('Access-Control-Allow-Methods','GET,POST,OPTIONS'); self.end_headers()
    def do_GET(self):
        p=urlparse(self.path).path
        if p=='/api/health': return self.send_json({'ok':True,'version':'V15.2','database':'SQLite','whatsapp':'direct-link-mode','renewals':'receipt-review'})
        if p=='/api/session': return self.send_json({'authenticated':is_admin(self),'user':ADMIN_USER if is_admin(self) else None})
        if p=='/api/receipt':
            if not require_admin(self): return
            from urllib.parse import parse_qs
            q=parse_qs(urlparse(self.path).query); rel=q.get('path',[''])[0]
            if not rel.startswith('receipts/') or '..' in rel or '/' not in rel:
                return self.send_json({'error':'Comprobante no válido'},400)
            fname=os.path.basename(rel); fpath=os.path.join(RECEIPTS_DIR,fname)
            if not os.path.isfile(fpath): return self.send_json({'error':'Comprobante no encontrado'},404)
            mime=mimetypes.guess_type(fpath)[0] or 'application/octet-stream'; raw=open(fpath,'rb').read()
            self.send_response(200); self.send_header('Content-Type',mime); self.send_header('Content-Length',str(len(raw))); self.send_header('Content-Disposition',f'inline; filename="{fname}"'); self.end_headers(); self.wfile.write(raw); return
        if p=='/api/state':
            if not require_admin(self): return
            return self.send_json(state())
        if p=='/api/services': return self.send_json({'services':[r['name'] for r in db().execute('SELECT name FROM services ORDER BY id')]})
        return super().do_GET()
    def do_POST(self):
        p=urlparse(self.path).path
        length=int(self.headers.get('Content-Length','0'))
        try: body=json.loads(self.rfile.read(length) or '{}')
        except Exception: return self.send_json({'error':'JSON inválido'},400)
        if p=='/api/login':
            user=str(body.get('username',''))
            password=str(body.get('password',''))
            if user!=ADMIN_USER or password!=ADMIN_PASSWORD:
                return self.send_json({'error':'Usuario o contraseña incorrectos'},401)
            token=secrets.token_urlsafe(32)
            SESSIONS[token]=time.time()+8*60*60
            self.send_response(200); raw=json.dumps({'ok':True,'user':ADMIN_USER}).encode(); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(raw))); self.send_header('Set-Cookie',f'prestadores_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800'); self.end_headers(); self.wfile.write(raw); return
        if p=='/api/logout':
            cookie=self.headers.get('Cookie','')
            for part in cookie.split(';'):
                part=part.strip()
                if part.startswith('prestadores_session='): SESSIONS.pop(part.split('=',1)[1],None)
            self.send_response(200); self.send_header('Set-Cookie','prestadores_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); self.send_header('Content-Length','0'); self.end_headers(); return
        if p=='/api/contact':
            arr=rows('events'); arr.append({'id':time.time(),'date':time.strftime('%Y-%m-%d %H:%M:%S'),'action':'Aceptación de condiciones','provider':body.get('providerName','—'),'detail':f"Usuario aceptó {body.get('termsVersion','TIVA-CONEXION-v1.0')}; contacto por WhatsApp"}); replace('events',arr[-500:]); return self.send_json({'ok':True})
        if p=='/api/application':
            arr=rows('applications'); arr.append(body); replace('applications',arr[-500:]); return self.send_json({'ok':True,'application':body})
        if p=='/api/renewal':
            # Public renewal request. Receipt is written outside the database and only metadata/path is stored in SQLite.
            receipt=body.pop('receiptData',None)
            if receipt:
                import base64
                try:
                    header,encoded=receipt.split(',',1)
                    raw=base64.b64decode(encoded, validate=True)
                    if len(raw)>5*1024*1024: return self.send_json({'error':'El comprobante supera 5 MB'},400)
                    ext='.bin'
                    mime=header.split(';')[0].replace('data:','')
                    ext=mimetypes.guess_extension(mime) or '.bin'
                    fname=f"renovacion_{int(time.time()*1000)}_{secrets.token_hex(4)}{ext}"
                    fpath=os.path.join(RECEIPTS_DIR,fname)
                    with open(fpath,'wb') as fh: fh.write(raw)
                    body['receiptPath']='receipts/'+fname
                except Exception:
                    return self.send_json({'error':'Comprobante inválido'},400)
            arr=rows('renewals'); body.setdefault('status','pendiente_comprobacion'); body.setdefault('createdAt',time.strftime('%Y-%m-%d %H:%M:%S')); arr.append(body); replace('renewals',arr[-500:])
            return self.send_json({'ok':True,'renewal':body})
        if p=='/api/state':
            if not require_admin(self): return
            for table,key in [('providers','data'),('applications','applications'),('renewals','renewals'),('events','events'),('notifications','notifications')]:
                replace(table,body.get(key,[]))
            return self.send_json({'ok':True,'state':state()})
        if p=='/api/event':
            if not require_admin(self): return
            arr=rows('events'); arr.append(body); replace('events',arr[-500:]); return self.send_json({'ok':True})
        if p=='/api/notification':
            if not require_admin(self): return
            arr=rows('notifications'); arr.append(body); replace('notifications',arr[-500:]); return self.send_json({'ok':True})
        if p=='/api/backup':
            if not require_admin(self): return
            return self.send_json({'ok':True,'state':state()})
        return self.send_json({'error':'Ruta no encontrada'},404)

if __name__=='__main__':
    init(); print(f'TIVA V15.4 funcionando en http://localhost:{PORT}')
    ThreadingHTTPServer(('0.0.0.0',PORT),Handler).serve_forever()
