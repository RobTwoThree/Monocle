from datetime import datetime, timedelta
import json
import time

from flask import Flask, render_template

from web import get_args  # pretty handy function, actually
import config
import db
import utils


with open('locales/pokemon.en.json') as f:
    pokemon_names = json.load(f)


app = Flask(__name__, template_folder='templates')


CACHE = {
    'data': None,
    'generated_at': None,
}


def get_stats():
    cache_valid = (
        CACHE['data'] and
        CACHE['generated_at'] > datetime.now() - timedelta(minutes=15)
    )
    if cache_valid:
        return CACHE['data']
    session = db.Session()
    forts = db.get_forts(session)
    session.close()
    count = {t.value: 0 for t in db.Team}
    strongest = {t.value: None for t in db.Team}
    percentages = {}
    last_date = 0
    for fort in forts:
        if fort['last_modified'] > last_date:
            last_date = fort['last_modified']
        team = fort['team']
        count[team] = count[team] + 1
        existing = strongest[team]
        should_replace = (
            existing is not None and
            fort['prestige'] > existing[0] or
            existing is None
        )
        if should_replace:
            strongest[team] = (
                fort['prestige'],
                fort['guard_pokemon_id'],
                pokemon_names[str(fort['guard_pokemon_id'])],
            )
    for team in db.Team:
        percentages[team.value] = round(
            count.get(team.value) / len(forts) * 100
        )
    CACHE['generated_at'] = datetime.now()
    CACHE['data'] = {
        'order': sorted(count, key=count.__getitem__, reverse=True),
        'count': count,
        'total_count': len(forts),
        'strongest': strongest,
        'percentages': percentages,
        'last_date': last_date,
        'generated_at': CACHE['generated_at'],
    }
    return CACHE['data']


@app.route('/')
def index():
    stats = get_stats()
    team_names = {k.value: k.name.title() for k in db.Team}
    styles = {1: 'primary', 2: 'danger', 3: 'warning'}
    return render_template(
        'gyms.html',
        area_name=config.AREA_NAME,
        area_size=utils.get_scan_area(),
        minutes_ago=int((datetime.now() - stats['generated_at']).seconds / 60),
        last_date_minutes_ago=int((time.time() - stats['last_date']) / 60),
        team_names=team_names,
        styles=styles,
        **stats
    )


if __name__ == '__main__':
    args = get_args()
    app.run(debug=True, host=args.host, port=args.port)
