import codecs
from functools import partial
import json
import pymysql
import re
import hmac
import wsgiref.util
from .secret import API_KEY, MYSQL_DB_PWD

connect = partial(
    pymysql.connect,
    user='surl',
    password=MYSQL_DB_PWD,
    db='shorturls',
    host='localhost',
    cursorclass=pymysql.cursors.DictCursor,
    charset='utf8mb4',
    autocommit=True,
)

SHORTURL_REGEX = re.compile(r'^[\w./+:]*$')

def get_all_shorturls():
    with connect() as ctx:
        ctx.execute(
            'SELECT `slug`, `target` FROM `shorturls`',
        )

        return ctx.fetchall()

def get_shorturl(slug):
    with connect() as ctx:
        ctx.execute(
            'SELECT `target` FROM `shorturls` WHERE `slug` = %s',
            (slug),
        )

        result = ctx.fetchone()
    return result['target'] if result else None

def put_shorturl(slug, target):
    if len(slug) > 100:
        raise ValueError('shorturl len is {}, must be less than 100'.format(len(slug)))
    if not bool(SHORTURL_REGEX.search(slug)):
        raise ValueError("shorturl '{}' contains illegal characters".format(slug))

    with connect() as ctx:
        # PUT is idempotent, so to maintain uniqueness we delete any
        # existing row with the slug
        ctx.execute(
            'DELETE FROM `shorturls` WHERE `slug` = %s',
            (slug),
        )
        ctx.execute(
            'INSERT INTO `shorturls` (slug, target) VALUES (%s, %s)',
            (slug, target),
        )

def delete_shorturl(slug):
    with connect() as ctx:
        # PUT is idempotent, so to maintain uniqueness we delete any
        # existing row with the slug
        ctx.execute(
            'DELETE FROM `shorturls` WHERE `slug` = %s',
            (slug),
        )

def respond_400(_, start_response, hint=None):
    start_response('400 Bad Request', [
        ('Content-Type', 'text/html'),
    ])
    message = 'bad request'
    if hint:
        message += ': ' + hint
    return [json.dumps({'error': message}).encode()]

def respond_404(_, start_response):
    start_response('404 Not Found', [
        ('Content-Type', 'text/html'),
    ])
    return ['endpoint unknown'.encode()]

def respond_get(environ, start_response):
    slug = environ['PATH_INFO'].lstrip('/')
    target = get_shorturl(slug)
    if target:
        start_response('302 Found', [
            ('Location', target),
        ])
        return []
    else:
        start_response('404 Not Found', [
            ('Content-Type', 'text/html'),
        ])
        return ['slug "{}" not found'.format(slug).encode()]

def respond_api(environ, start_response):
    if not hmac.compare_digest(environ.get('HTTP_X_API_KEY'), API_KEY):
        start_response('401 Unauthorized', [])
        return []
    if environ['REQUEST_METHOD'] == 'PUT':
        try:
            slug = environ['PATH_INFO'].lstrip('/')
            body = json.load(codecs.getreader('utf-8')(environ['wsgi.input']))
            target = body.get('target')
            if not target:
                return respond_400(environ, start_response, 'must include target')
            put_shorturl(slug, target)
        except json.JSONDecodeError as e:
            return respond_400(environ, start_response, 'invalid json')
        except ValueError as e:
            return respond_400(environ, start_response, 'invalid shorturl: {}'.format(e))
        start_response('204 No Content', [])
        return []
    elif environ['REQUEST_METHOD'] == 'DELETE':
        slug = environ['PATH_INFO'].lstrip('/')
        delete_shorturl(slug)
        start_response('204 No Content', [])
        return []
    elif environ['REQUEST_METHOD'] == 'GET':
        slug = environ['PATH_INFO'].lstrip('/')
        if len(slug) == 0:
            # list all slugs
            slugs = get_all_shorturls()
            start_response('200 OK', [
                ('Content-Type', 'application/json'),
            ])
            return [json.dumps(slugs).encode()]
        else:
            target = get_shorturl(slug)
            if target:
                start_response('200 OK', [
                    ('Content-Type', 'application/json'),
                ])
                return [json.dumps({
                    'slug': slug,
                    'target': target
                }).encode()]
            else:
                start_response('404 Not Found', [
                    ('Content-Type', 'application/json'),
                ])
                return [json.dumps({
                    'slug': slug,
                    'error': 'slug not found'
                }).encode()]
    else:
        start_response('405 Method Not Allowed', [
            ('Content-Type', 'text/html'),
        ])
        return ['wrong http method "{}"'.format(environ['REQUEST_METHOD']).encode()]


def app(environ, start_response):
    return {
        'get': respond_get,
        'api': respond_api,
    }.get(
        wsgiref.util.shift_path_info(environ),
        respond_404,
    )(environ, start_response)
