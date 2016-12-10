# -*- coding: utf-8 -*-
from datetime import datetime
import argparse
import json

import requests
from flask import Flask, request, render_template
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from multiprocessing.managers import BaseManager

import config
import db
import utils
from names import POKEMON_NAMES

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


# Check whether config has all necessary attributes
REQUIRED_SETTINGS = (
    'TRASH_IDS',
    'AREA_NAME',
    'REPORT_SINCE',
    'MAP_PROVIDER_URL',
    'MAP_PROVIDER_ATTRIBUTION',
    'GOOGLE_MAPS_KEY'
)
for setting_name in REQUIRED_SETTINGS:
    if not hasattr(config, setting_name):
        raise RuntimeError('Please set "{}" in config'.format(setting_name))


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '-H',
        '--host',
        help='Set web server listening host',
        default='127.0.0.1'
    )
    parser.add_argument(
        '-P',
        '--port',
        type=int,
        help='Set web server listening port',
        default=5000
    )
    parser.add_argument(
        '-d', '--debug', help='Debug Mode', action='store_true'
    )
    parser.set_defaults(DEBUG=True)
    return parser.parse_args()


app = Flask(__name__, template_folder='templates')


@app.route('/data')
def pokemon_data():
    return json.dumps(get_pokemarkers())


@app.route('/workers_data')
def workers_data():
    return json.dumps(get_worker_markers())


@app.route('/')
def fullmap():
    map_center = utils.get_map_center()
    return render_template(
        'newmap.html',
        area_name=config.AREA_NAME,
        map_center=map_center,
        map_provider_url=config.MAP_PROVIDER_URL,
        map_provider_attribution=config.MAP_PROVIDER_ATTRIBUTION,
    )

@app.route('/workers')
def workers_map():
    map_center = utils.get_map_center()
    return render_template(
        'workersmap.html',
        area_name=config.AREA_NAME,
        map_center=map_center,
        map_provider_url=config.MAP_PROVIDER_URL,
        map_provider_attribution=config.MAP_PROVIDER_ATTRIBUTION
    )

class AccountManager(BaseManager): pass
AccountManager.register('worker_dict')
manager = AccountManager(address=utils.get_address(), authkey=b'monkeys')
manager.connect()

def get_pokemarkers():
    markers = []
    session = db.Session()
    pokemons = db.get_sightings(session)
    forts = db.get_forts(session)
    session.close()

    for pokemon in pokemons:
        markers.append({
            'id': 'pokemon-{}'.format(pokemon.id),
            'type': 'pokemon',
            'trash': pokemon.pokemon_id in config.TRASH_IDS,
            'name': POKEMON_NAMES[pokemon.pokemon_id],
            'pokemon_id': pokemon.pokemon_id,
            'lat': pokemon.lat,
            'lon': pokemon.lon,
            'expires_at': pokemon.expire_timestamp,
        })
    for fort in forts:
        if fort['guard_pokemon_id']:
            pokemon_name = POKEMON_NAMES[fort['guard_pokemon_id']]
        else:
            pokemon_name = 'Empty'
        markers.append({
            'id': 'fort-{}'.format(fort['fort_id']),
            'sighting_id': fort['id'],
            'type': 'fort',
            'prestige': fort['prestige'],
            'pokemon_id': fort['guard_pokemon_id'],
            'pokemon_name': pokemon_name,
            'team': fort['team'],
            'lat': fort['lat'],
            'lon': fort['lon'],
        })
    worker_dict = manager.worker_dict()
    # Worker start points
    for worker_no, data in worker_dict.items():
        coords = data[0]
        unix_time = data[1]
        time = datetime.fromtimestamp(unix_time).strftime('%I:%M %p').lstrip('0')
        markers.append({
            'lat': coords[0],
            'lon': coords[1],
            'type': 'worker',
            'worker_no': worker_no,
            'time': time
        })
    return markers

def get_worker_markers():
    markers = []

    worker_dict = manager.worker_dict()
    # Worker start points
    for worker_no, data in worker_dict.items():
        coords = data[0]
        unix_time = data[1]
        speed = str(round(data[2], 1)) + 'mph'
        total_seen = data[3]
        visits = data[4]
        seen_here = data[5]
        sent_notification = data[6]
        time = datetime.fromtimestamp(unix_time).strftime('%I:%M:%S %p').lstrip('0')
        markers.append({
            'lat': coords[0],
            'lon': coords[1],
            'type': 'worker',
            'worker_no': worker_no,
            'time': time,
            'speed': speed,
            'total_seen': total_seen,
            'visits': visits,
            'seen_here': seen_here,
            'sent_notification': sent_notification
        })
    return markers


@app.route('/report')
def report_main():
    session = db.Session()
    top_pokemon = db.get_top_pokemon(session)
    bottom_pokemon = db.get_top_pokemon(session, order='ASC')
    bottom_sightings = db.get_all_sightings(
        session, [r[0] for r in bottom_pokemon]
    )
    rare_pokemon = db.get_rare_pokemon(session)
    if rare_pokemon:
        rare_sightings = db.get_all_sightings(
            session, [r[0] for r in rare_pokemon]
        )
    else:
        rare_sightings = []
    js_data = {
        'charts_data': {
            'punchcard': db.get_punch_card(session),
            'top30': [(POKEMON_NAMES[r[0]], r[1]) for r in top_pokemon],
            'bottom30': [
                (POKEMON_NAMES[r[0]], r[1]) for r in bottom_pokemon
            ],
            'rare': [
                (POKEMON_NAMES[r[0]], r[1]) for r in rare_pokemon
            ],
        },
        'maps_data': {
            'bottom30': [sighting_to_marker(s) for s in bottom_sightings],
            'rare': [sighting_to_marker(s) for s in rare_sightings],
        },
        'map_center': utils.get_map_center(),
        'zoom': 13,
    }
    icons = {
        'top30': [(r[0], POKEMON_NAMES[r[0]]) for r in top_pokemon],
        'bottom30': [(r[0], POKEMON_NAMES[r[0]]) for r in bottom_pokemon],
        'rare': [(r[0], POKEMON_NAMES[r[0]]) for r in rare_pokemon],
        'nonexistent': [
            (r, POKEMON_NAMES[r])
            for r in db.get_nonexistent_pokemon(session)
        ]
    }
    session_stats = db.get_session_stats(session)
    session.close()

    area = utils.get_scan_area()

    return render_template(
        'report.html',
        current_date=datetime.now(),
        area_name=config.AREA_NAME,
        area_size=area,
        total_spawn_count=session_stats['count'],
        spawns_per_hour=session_stats['per_hour'],
        session_start=session_stats['start'],
        session_end=session_stats['end'],
        session_length_hours=int(session_stats['length_hours']),
        js_data=js_data,
        icons=icons,
        google_maps_key=config.GOOGLE_MAPS_KEY,
    )


@app.route('/report/<int:pokemon_id>')
def report_single(pokemon_id):
    session = db.Session()
    session_stats = db.get_session_stats(session)
    js_data = {
        'charts_data': {
            'hours': db.get_spawns_per_hour(session, pokemon_id),
        },
        'map_center': utils.get_map_center(),
        'zoom': 13,
    }
    session.close()
    return render_template(
        'report_single.html',
        current_date=datetime.now(),
        area_name=config.AREA_NAME,
        area_size=utils.get_scan_area(),
        pokemon_id=pokemon_id,
        pokemon_name=POKEMON_NAMES[pokemon_id],
        total_spawn_count=db.get_total_spawns_count(session, pokemon_id),
        session_start=session_stats['start'],
        session_end=session_stats['end'],
        session_length_hours=int(session_stats['length_hours']),
        google_maps_key=config.GOOGLE_MAPS_KEY,
        js_data=js_data,
    )


def sighting_to_marker(sighting):
    return {
        'icon': '/static/icons/{}.png'.format(sighting.pokemon_id),
        'lat': sighting.lat,
        'lon': sighting.lon,
    }


@app.route('/report/heatmap')
def report_heatmap():
    session = db.Session()
    pokemon_id = request.args.get('id')
    points = db.get_all_spawn_coords(session, pokemon_id=pokemon_id)
    session.close()
    return json.dumps(points)


if __name__ == '__main__':
    args = get_args()
    app.run(debug=True, threaded=True, host=args.host, port=args.port)
