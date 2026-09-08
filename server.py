#!/usr/bin/env python3
import json, os, sqlite3, mimetypes, hashlib, secrets, time, base64
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

ROOT=os.path.dirname(os.path.abspath(__file__))
DB=os.path.join(ROOT,'prestadores_v9.db')
PORT=int(os.environ.get('PORT','8000'))
DATABASE_URL=os.environ.get('DATABASE_URL','').strip()
USE_POSTGRES=bool(DATABASE_URL)
if USE_POSTGRES:
    import psycopg2
    from psycopg2.extras import RealDictCursor
SESSIONS={}
RECEIPTS_DIR=os.path.join(ROOT,'receipts')
os.makedirs(RECEIPTS_DIR, exist_ok=True)
ADMIN_USER=os.environ.get('PRESTADORES_ADMIN_USER','admin')
ADMIN_PASSWORD=os.environ.get('PRESTADORES_ADMIN_PASSWORD','Admin123!')
SERVICES=['Aire acondicionado','Albañilería','Animación de eventos','Armado de muebles','Asesoría contable','Asesoría jurídica','Asesoría informática','Asistencia virtual','Barbería a domicilio','Cuidado de adultos mayores','Cuidado de mascotas','Cuidado de niños','Cerrajería','Clases de idiomas','Clases de música','Clases de matemáticas','Clases de refuerzo escolar','Coaching personal','Community manager','Confección de ropa','Construcción','Consultoría empresarial','Cocina a domicilio','Decoración de eventos','Diseño gráfico','Diseño web','Electricidad','Enfermería a domicilio','Entrenador personal','Estilismo','Fotografía','Fumigación','Gasfitería / plomería','Gestión de redes sociales','Instalación de cámaras','Instalación de pisos','Instalación de vidrios','Instalación de drywall','Instalación de internet','Jardinería','Lavado de autos','Lavado de muebles','Lavandería','Limpieza de casas','Limpieza de oficinas','Limpieza de vidrios','Manicure y pedicure','Maquillaje profesional','Masajes','Mantenimiento de computadores','Mantenimiento de celulares','Mantenimiento de electrodomésticos','Mantenimiento de piscinas','Mantenimiento de motos','Mantenimiento de bicicletas','Mantenimiento de aires acondicionados','Mensajería','Mudanzas','Niñera','Nutrición','Organización de eventos','Organización de espacios','Panadería y repostería','Peluquería a domicilio','Pintura de interiores','Pintura de exteriores','Plomería','Podología','Reparación de calzado','Reparación de electrodomésticos','Reparación de computadores','Reparación de celulares','Reparación de muebles','Reparación de motos','Reparación de bicicletas','Reparación de puertas','Reparación de ventanas','Reparación de lavadoras','Reparación de neveras','Reparación de televisores','Reparación de ventiladores','Reparación de herramientas','Reparación de instrumentos musicales','Reparación de relojes','Reparación de joyería','Secretaría / digitación','Seguridad privada','Servicio de catering','Servicio de mesero','Soporte técnico','Tapicería','Tatuaje y piercing','Traducción','Transporte particular','Transporte de carga','Tutorías académicas','Venta de comida preparada','Video y edición','Visagismo de cejas','Costura y arreglos']

def db():
    if USE_POSTGRES:
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def init():
    c=db()
    if USE_POSTGRES:
        cur=c.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS providers(id TEXT PRIMARY KEY, data TEXT NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY, data TEXT NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS renewals(id TEXT PRIMARY KEY, data TEXT NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, data TEXT NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY, data TEXT NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS services(id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS receipts(path TEXT PRIMARY KEY, mime TEXT NOT NULL, data BYTEA NOT NULL)")
        cur.execute("CREATE TABLE IF NOT EXISTS application_files(id TEXT PRIMARY KEY, application_id TEXT NOT NULL, kind TEXT NOT NULL, filename TEXT NOT NULL, mime TEXT NOT NULL, data BYTEA NOT NULL)")
        for i,s in enumerate(SERVICES,1): cur.execute('INSERT INTO services(id,name) VALUES(%s,%s) ON CONFLICT (id) DO NOTHING',(str(i),s))
        c.commit(); c.close(); return
    c.executescript('''
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
    c=db()
    try:
        cur=c.cursor(); cur.execute(f'SELECT data FROM {table} ORDER BY id'); result=cur.fetchall()
        return [json.loads(r['data'] if isinstance(r,dict) else r[0]) for r in result]
    finally: c.close()

def replace(table, items):
    c=db()
    try:
        cur=c.cursor(); cur.execute(f'DELETE FROM {table}')
        for i,item in enumerate(items,1):
            ident=str(item.get('id',i)); payload=json.dumps(item,ensure_ascii=False)
            if USE_POSTGRES: cur.execute(f'INSERT INTO {table}(id,data) VALUES(%s,%s)',(ident,payload))
            else:
                try: ident=int(ident)
                except: ident=i
                cur.execute(f'INSERT OR REPLACE INTO {table}(id,data) VALUES(?,?)',(ident,payload))
        c.commit()
    finally: c.close()

def state():
    c=db()
    try:
        cur=c.cursor(); cur.execute('SELECT name FROM services ORDER BY id'); result=cur.fetchall()
        services=[r['name'] if isinstance(r,dict) else r[0] for r in result]
    finally: c.close()
    return {'data':rows('providers'),'applications':rows('applications'),'renewals':rows('renewals'),'events':rows('events'),'notifications':rows('notifications'),'services':services}

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
        if p=='/api/health': return self.send_json({'ok':True,'version':'V17.5','database':'PostgreSQL' if USE_POSTGRES else 'SQLite','whatsapp':'direct-link-mode','renewals':'receipt-review'})
        if p=='/api/session': return self.send_json({'authenticated':is_admin(self),'user':ADMIN_USER if is_admin(self) else None})
        if p=='/api/application-file':
            if not require_admin(self): return
            from urllib.parse import parse_qs
            q=parse_qs(urlparse(self.path).query); aid=q.get('application_id',[''])[0]; kind=q.get('kind',[''])[0]
            if not aid or kind not in ('idDoc','photo'): return self.send_json({'error':'Archivo no válido'},400)
            c=db()
            try:
                cur=c.cursor()
                if USE_POSTGRES:
                    cur.execute('SELECT filename,mime,data FROM application_files WHERE application_id=%s AND kind=%s',(str(aid),kind)); row=cur.fetchone()
                    if not row: return self.send_json({'error':'Archivo no encontrado'},404)
                    filename=row['filename']; mime=row['mime']; raw=bytes(row['data'])
                else:
                    ident=int(float(aid)) if aid.replace('.','',1).isdigit() else -1
                    cur.execute('SELECT data FROM applications WHERE id=?',(ident,)); row=cur.fetchone()
                    if not row: return self.send_json({'error':'Archivo no encontrado'},404)
                    ad=json.loads(row['data'] if isinstance(row,dict) else row[0]); path=ad.get(kind+'Path','')
                    fpath=os.path.join(ROOT,path)
                    if not fpath.startswith(ROOT) or not os.path.isfile(fpath): return self.send_json({'error':'Archivo no encontrado'},404)
                    filename=os.path.basename(fpath); mime=mimetypes.guess_type(filename)[0] or 'application/octet-stream'; raw=open(fpath,'rb').read()
            finally: c.close()
            disposition='inline' if kind=='photo' and mime.startswith('image/') else 'attachment'
            safe_filename=filename.replace('\"','_').replace('\r','_').replace('\n','_')
            self.send_response(200); self.send_header('Content-Type',mime); self.send_header('Content-Length',str(len(raw))); self.send_header('Content-Disposition',f'{disposition}; filename="{safe_filename}"'); self.end_headers(); self.wfile.write(raw); return
        if p=='/api/provider-photo':
            from urllib.parse import parse_qs
            q=parse_qs(urlparse(self.path).query); pid=q.get('id',[''])[0]
            if not pid: return self.send_json({'error':'Prestador no válido'},400)
            c=db()
            try:
                cur=c.cursor(); cur.execute('SELECT data FROM providers WHERE id=%s',(str(pid),)); prow=cur.fetchone()
                if not prow: return self.send_json({'error':'Prestador no encontrado'},404)
                pdata=json.loads(prow['data'] if isinstance(prow,dict) else prow[0]); aid=str(pdata.get('photoApplicationId',''))
                if USE_POSTGRES:
                    cur.execute("SELECT mime,data FROM application_files WHERE application_id=%s AND kind='photo'",(aid,)); row=cur.fetchone()
                    if row:
                        raw=bytes(row['data']); mime=row['mime']
                else:
                    ident=int(float(aid)) if aid.replace('.','',1).isdigit() else -1
                    cur.execute('SELECT data FROM applications WHERE id=?',(ident,)); row=cur.fetchone()
                    if row:
                        ad=json.loads(row['data'] if isinstance(row,dict) else row[0]); path=ad.get('photoPath','')
                        fpath=os.path.join(ROOT,path)
                        if os.path.isfile(fpath) and fpath.startswith(ROOT):
                            raw=open(fpath,'rb').read(); mime=mimetypes.guess_type(fpath)[0] or 'application/octet-stream'
            finally: c.close()
            if not row: return self.send_json({'error':'Foto no encontrada'},404)
            self.send_response(200); self.send_header('Content-Type',mime); self.send_header('Cache-Control','public, max-age=3600'); self.send_header('Content-Length',str(len(raw))); self.end_headers(); self.wfile.write(raw); return
        if p=='/api/receipt':
            if not require_admin(self): return
            from urllib.parse import parse_qs
            q=parse_qs(urlparse(self.path).query); rel=q.get('path',[''])[0]
            if not rel.startswith('receipts/') or '..' in rel or '/' not in rel:
                return self.send_json({'error':'Comprobante no válido'},400)
            fname=os.path.basename(rel)
            if USE_POSTGRES:
                c=db()
                try:
                    cur=c.cursor(); cur.execute('SELECT mime,data FROM receipts WHERE path=%s',(rel,)); row=cur.fetchone()
                finally: c.close()
                if not row: return self.send_json({'error':'Comprobante no encontrado'},404)
                mime=row['mime']; raw=bytes(row['data'])
            else:
                fpath=os.path.join(RECEIPTS_DIR,fname)
                if not os.path.isfile(fpath): return self.send_json({'error':'Comprobante no encontrado'},404)
                mime=mimetypes.guess_type(fpath)[0] or 'application/octet-stream'; raw=open(fpath,'rb').read()
            self.send_response(200); self.send_header('Content-Type',mime); self.send_header('Content-Length',str(len(raw))); self.send_header('Content-Disposition',f'inline; filename="{fname}"'); self.end_headers(); self.wfile.write(raw); return
        if p=='/api/state':
            if not require_admin(self): return
            return self.send_json(state())
        if p=='/api/providers':
            # Catálogo público: solo prestadores activos y no vencidos.
            # No expone solicitudes, cédulas, fotos documentales ni auditoría.
            today_value=time.strftime('%Y-%m-%d')
            providers=[]
            for x in rows('providers'):
                if not isinstance(x,dict):
                    continue
                expiration=str(x.get('expiration') or '')
                active=bool(x.get('active')) and (not expiration or expiration >= today_value)
                if not active:
                    continue
                providers.append({
                    'id':x.get('id'),'name':x.get('name'),'service':x.get('service'),
                    'city':x.get('city'),'phone':x.get('phone'),'description':x.get('description',''),
                    'active':True,'expiration':expiration,'exposures':x.get('exposures',0),
                    'requests':x.get('requests',0),'verified':x.get('verified',False),
                    'photoUrl':x.get('photoUrl','')
                })
            return self.send_json({'providers':providers})
        if p=='/api/services':
            c=db()
            try:
                cur=c.cursor(); cur.execute('SELECT name FROM services ORDER BY id'); rr=cur.fetchall(); names=[r['name'] if isinstance(r,dict) else r[0] for r in rr]
            finally: c.close()
            return self.send_json({'services':names})
        return super().do_GET()
    def do_POST(self):
        p=urlparse(self.path).path

        # La subida de documentos NO es JSON: recibe los bytes binarios
        # directamente en el cuerpo de la petición. Debe procesarse antes
        # de intentar json.loads(), de lo contrario el servidor responde
        # 'JSON inválido'.
        if p=='/api/application-file-upload':
            aid=str(self.headers.get('X-Application-Id','')).strip()
            kind=str(self.headers.get('X-File-Kind','')).strip()
            filename=str(self.headers.get('X-File-Name','')).strip()
            if not aid or kind not in ('idDoc','photo') or not filename:
                return self.send_json({'error':'Datos de archivo incompletos'},400)
            length=int(self.headers.get('Content-Length','0'))
            if length<=0: return self.send_json({'error':'El archivo está vacío'},400)
            if length>2*1024*1024: return self.send_json({'error':'Cada documento debe pesar máximo 2 MB'},400)
            raw=self.rfile.read(length)
            if len(raw)!=length: return self.send_json({'error':'No fue posible recibir el archivo completo'},400)
            from urllib.parse import unquote
            filename=os.path.basename(unquote(filename)).replace('\"','_') or (kind+'.bin')
            mime=self.headers.get('Content-Type','application/octet-stream').split(';')[0].strip() or 'application/octet-stream'
            c=db()
            try:
                cur=c.cursor()
                if USE_POSTGRES:
                    cur.execute('SELECT data FROM applications WHERE id=%s',(aid,)); row=cur.fetchone()
                    if not row: return self.send_json({'error':'Solicitud no encontrada'},404)
                    cur.execute('DELETE FROM application_files WHERE application_id=%s AND kind=%s',(aid,kind))
                    cur.execute('INSERT INTO application_files(id,application_id,kind,filename,mime,data) VALUES(%s,%s,%s,%s,%s,%s)',(secrets.token_hex(16),aid,kind,filename,mime,psycopg2.Binary(raw)))
                    app=json.loads(row['data'] if isinstance(row,dict) else row[0])
                else:
                    ident=int(float(aid)) if aid.replace('.','',1).isdigit() else -1
                    cur.execute('SELECT data FROM applications WHERE id=?',(ident,)); row=cur.fetchone()
                    if not row: return self.send_json({'error':'Solicitud no encontrada'},404)
                    app=json.loads(row['data'] if isinstance(row,dict) else row[0])
                    d=os.path.join(ROOT,'private_documents'); os.makedirs(d,exist_ok=True)
                    safe=f'{aid}_{kind}_{secrets.token_hex(4)}_{filename}'; open(os.path.join(d,safe),'wb').write(raw); app[kind+'Path']='private_documents/'+safe
                app[kind+'Available']=True
                app[kind+'Name']=filename
                app[kind+'Size']=length
                app[kind+'Url']=f'/api/application-file?application_id={aid}&kind={kind}'
                if app.get('idDocAvailable') and app.get('photoAvailable'):
                    app['status']='pendiente'
                    app['documentStatus']='recibida_para_revision'
                    app['documentsStored']=True
                if USE_POSTGRES:
                    cur.execute('UPDATE applications SET data=%s WHERE id=%s',(json.dumps(app,ensure_ascii=False),aid))
                else:
                    cur.execute('UPDATE applications SET data=? WHERE id=?',(json.dumps(app,ensure_ascii=False),ident))
                c.commit()
            except Exception:
                c.rollback()
                raise
            finally: c.close()
            return self.send_json({'ok':True,'application':app,'kind':kind,'size':length})

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
            # La solicitud se crea primero con metadata. Los archivos se suben
            # por separado para evitar enviar dos archivos de hasta 2 MB dentro
            # de un único JSON/base64 (que puede superar los límites del proxy).
            aid=str(body.get('id') or int(time.time()*1000))
            for key in ('idDocData','photoData'):
                body.pop(key,None)
            body['id']=aid
            body['status']='subiendo_documentos'
            body['documentStatus']='esperando_documentos'
            body['documentsStored']=False
            body['idDocAvailable']=False
            body['photoAvailable']=False
            c=db()
            try:
                cur=c.cursor()
                if USE_POSTGRES:
                    cur.execute('INSERT INTO applications(id,data) VALUES(%s,%s) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data',(aid,json.dumps(body,ensure_ascii=False)))
                else:
                    cur.execute('INSERT OR REPLACE INTO applications(id,data) VALUES(?,?)',(int(float(aid)) if aid.replace('.','',1).isdigit() else int(time.time()*1000),json.dumps(body,ensure_ascii=False)))
                c.commit()
            finally: c.close()
            return self.send_json({'ok':True,'application':body})
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
                    rel='receipts/'+fname
                    if USE_POSTGRES:
                        c=db()
                        try:
                            cur=c.cursor(); cur.execute('INSERT INTO receipts(path,mime,data) VALUES(%s,%s,%s) ON CONFLICT (path) DO UPDATE SET mime=EXCLUDED.mime,data=EXCLUDED.data',(rel,mime,psycopg2.Binary(raw))); c.commit()
                        finally: c.close()
                    else:
                        fpath=os.path.join(RECEIPTS_DIR,fname)
                        with open(fpath,'wb') as fh: fh.write(raw)
                    body['receiptPath']=rel
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
    init(); print(f'TIVA V17.6 funcionando en http://localhost:{PORT}')
    ThreadingHTTPServer(('0.0.0.0',PORT),Handler).serve_forever()
