#!/usr/bin/env python3

from datetime import datetime
from pkg_resources import resource_filename

try:
    from ujson import dumps
    from flask import json as flask_json
    flask_json.dumps = lambda obj, **kwargs: dumps(obj, double_precision=6)
except ImportError:
    from json import dumps

from flask import Flask, jsonify, Markup, render_template, request

from monocle import db, sanitized as conf
from monocle.names import POKEMON
from monocle.web_utils import *
from monocle.bounds import area, center

from shapely.geometry import Polygon, Point

app = Flask(__name__, template_folder=resource_filename('monocle', 'templates'), static_folder=resource_filename('monocle', 'static'))

def balance():
    show_balance = ''
    
    if conf.BALANCE and conf.FUNDING_GOAL:
        show_balance = '<div>Monthly Operational Cost: $' + conf.FUNDING_GOAL + '</div>'
        show_balance += '<div>Current Balance: $' + conf.BALANCE + ' (updated daily)</div>'
    return Markup(show_balance)

def ticker():
    ticker_items = ''
    
    if conf.TICKER_ITEMS:
        ticker_items = '<div id="message_ticker_' + conf.TICKER_COLOR + '"><div class="ticker">' + conf.TICKER_ITEMS + '</div></div>'
    return Markup(ticker_items)

def motd():
    motd = ''

    if conf.MOTD:
        motd = '<div class="motd">' + conf.MOTD + '</div>'
    return Markup(motd)

def splash():
    splash = ''
    splash_message = ''
    
    if conf.SHOW_SPLASH:
        if conf.SPLASH_MESSAGE is None:
            splash = '<div id="splash_popup" class="splash_container">'
            splash += '<div class="splash_text">'
            splash += 'Funding levels to maintain scans and maps are running low.<br>Please consider donating.<br><br>Thank you for your support.'
            splash += '</div>'
            splash += '<div class="splash_btn_container">'
            splash += '<div class="splash_donate_btn">'
            splash += '<form id="splash_donate_close_btn" action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">'
            splash += '<input type="hidden" name="cmd" value="_s-xclick">'
            splash += '<input type="hidden" name="hosted_button_id" value="' + conf.PAYPAL_BUTTON_CODE + '">'
            splash += '<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!">'
            splash += '<img alt="" border="0" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1">'
            splash += '</form>'
            splash += '</div>'
            splash += '<button id="splash_popup_close_btn" type="button" class="splash_clear_btn">Next Time</button>'
            splash += '</div>'
            splash += '</div>'
        else:
            splash = '<div id="splash_popup" class="splash_container">'
            splash += '<div class="splash_text">'
            splash += conf.SPLASH_MESSAGE
            splash += '</div>'
            splash += '<div class="splash_btn_container">'
            splash += '<button id="splash_popup_close_btn" type="button" class="splash_clear_btn">OK</button>'
            splash += '</div>'
            splash += '</div>'
    return Markup(splash)

def social_links():
    social_links = ''

    if conf.PAYPAL_URL:
        social_links = '<a class="map_btn paypal-icon" target="_blank" href="' + conf.PAYPAL_URL + '"></a>'
    if conf.FB_PAGE_ID:
        social_links += '<a class="map_btn facebook-icon" target="_blank" href="https://www.facebook.com/' + conf.FB_PAGE_ID + '"></a>'
    if conf.TWITTER_SCREEN_NAME:
        social_links += '<a class="map_btn twitter-icon" target="_blank" href="https://www.twitter.com/' + conf.TWITTER_SCREEN_NAME + '"></a>'
    if conf.DISCORD_INVITE_ID:
        social_links += '<a class="map_btn discord-icon" target="_blank" href="https://discord.gg/' + conf.DISCORD_INVITE_ID + '"></a>'
    if conf.TELEGRAM_USERNAME:
        social_links += '<a class="map_btn telegram-icon" target="_blank" href="https://www.telegram.me/' + conf.TELEGRAM_USERNAME + '"></a>'

    return Markup(social_links)

def donate_tab():
    donate_tab = ''
    
    if conf.PAYPAL_URL:
        donate_tab = '<li><a href="#" data-panel="donate">Donate</a></li>'
    return Markup(donate_tab)

def donate_tab_content():
    donate_tab_content = ''
    
    if conf.PAYPAL_URL:
        donate_tab_content = '<div class="panel panel-default settings-panel" data-panel="donate">'
        donate_tab_content += '<div class="panel-heading">Donations Welcome</div>'
        donate_tab_content += '<div class="panel-body"><br>Maps are free to use. Donations are more than welcome to help fund the scans that power these maps.<br><br>'
        donate_tab_content += '<form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top">'
        donate_tab_content += '<input type="hidden" name="cmd" value="_s-xclick">'
        donate_tab_content += '<input type="hidden" name="hosted_button_id" value="' + conf.PAYPAL_BUTTON_CODE + '">'
        donate_tab_content += '<input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif" border="0" name="submit" alt="PayPal - The safer, easier way to pay online!">'
        donate_tab_content += '<img alt="" border="0" src="https://www.paypalobjects.com/en_US/i/scr/pixel.gif" width="1" height="1">'
        donate_tab_content += '</form>'
        donate_tab_content += '<br>Monthly operational costs and current balance will be provided when funds run low.<br><br>'
        if conf.BALANCE and conf.FUNDING_GOAL:
            donate_tab_content += '<div>Monthly Operational Cost: $' + conf.FUNDING_GOAL + '</div>'
            donate_tab_content += '<div>Current Balance: $' + conf.BALANCE + ' (updated daily)</div>'
        donate_tab_content += '</div>'
        donate_tab_content += '</div>'
    
    return Markup(donate_tab_content)

def announcements_tab():
    announcements_tab = ''
    
    if conf.ANNOUNCEMENTS:
        announcements_tab = '<li><a href="#" data-panel="info">Info</a></li>'
    return Markup(announcements_tab)

def announcements():
    announcements = ''

    if conf.ANNOUNCEMENTS:
        announcements = '<div class="info-body"><ul type="square">' + conf.ANNOUNCEMENTS + '</ul></div>'
    return Markup(announcements)

def show_iv_menu_item():
    show_iv_menu_item = ''

    if conf.MAP_SHOW_DETAILS:
        show_iv_menu_item = '<hr />'
        show_iv_menu_item += '<h5>Show IV under marker</h5>'
        show_iv_menu_item += '<div class="btn-group" role="group" data-group="SHOW_IV">'
        show_iv_menu_item += '<button type="button" class="btn btn-default" data-value="1" onClick="window.location.reload()">Yes</button>'
        show_iv_menu_item += '<button type="button" class="btn btn-default" data-value="0" onClick="window.location.reload()">No</button>'
        show_iv_menu_item += '</div>'
        show_iv_menu_item += '<h6>*IV not accurate at this time</h6>'
    return Markup(show_iv_menu_item)

def show_form_menu_item():
    show_form_menu_item = ''

    if conf.SHOW_FORM_MENU_ITEM:
        show_form_menu_item = '<h5>Show Unown letter above Unown marker</h5>'
        show_form_menu_item += '<div class="btn-group" role="group" data-group="SHOW_FORM">'
        show_form_menu_item += '<button type="button" class="btn btn-default" data-value="1" onClick="window.location.reload()">Yes</button>'
        show_form_menu_item += '<button type="button" class="btn btn-default" data-value="0" onClick="window.location.reload()">No</button>'
        show_form_menu_item += '</div>'
        show_form_menu_item += '<hr />'
    return Markup(show_form_menu_item)

def display_boosted_feature():
    display_boosted_feature = ''

    if conf.DISPLAY_BOOSTED_FEATURE:
        display_boosted_feature = '<hr />'
        display_boosted_feature += '<h5>Highlight Boosted Pokemon</h5>'
        display_boosted_feature += '<div class="btn-group" role="group" data-group="show_boosted_pokemon">'
        display_boosted_feature +=  '<button type="button" class="btn btn-default" data-value="display">Display</button>'
        display_boosted_feature +=  '<button type="button" class="btn btn-default" data-value="hide">Hide</button>'
        display_boosted_feature +=  '</div>'
    return Markup(display_boosted_feature)

def render_map():
    css_js = ''

    if conf.LOAD_CUSTOM_CSS_FILE:
        css_js = '<link rel="stylesheet" href="static/css/custom.css">'
    if conf.LOAD_CUSTOM_JS_FILE:
        css_js += '<script type="text/javascript" src="static/js/custom.js"></script>'

    js_vars = Markup(
        "_defaultSettings['FIXED_OPACITY'] = '{:d}'; "
        "_defaultSettings['SHOW_TIMER'] = '{:d}'; "
        "_defaultSettings['SHOW_SPLASH'] = '{:d}'; "
        "_defaultSettings['SHOW_RAID_TIMER'] = '{:d}'; "
        "_defaultSettings['SHOW_IV'] = '{:d}'; "
        "_defaultSettings['SHOW_FORM'] = '{:d}'; "
        "_defaultSettings['MAP_CHOICE'] = '{:d}'; "
        "_defaultSettings['TRASH_IDS'] = [{}]; "
        "_defaultSettings['RAID_IDS'] = [{}]; ".format(conf.FIXED_OPACITY, conf.SHOW_TIMER, conf.SHOW_SPLASH, conf.SHOW_RAID_TIMER, conf.SHOW_IV, conf.SHOW_FORM, 0, ', '.join(str(p_id) for p_id in conf.TRASH_IDS), ', '.join(str(r_id) for r_id in conf.RAID_IDS)))

    template = app.jinja_env.get_template('custom.html' if conf.LOAD_CUSTOM_HTML_FILE else 'newmap.html')
    return template.render(
        area_name=conf.AREA_NAME,
        map_center=center,
        dark_map_opacity=conf.DARK_MAP_OPACITY,
        dark_map_provider_url=conf.DARK_MAP_PROVIDER_URL,
        dark_map_provider_attribution=conf.DARK_MAP_PROVIDER_ATTRIBUTION,
        light_map_opacity=conf.LIGHT_MAP_OPACITY,
        light_map_provider_url=conf.LIGHT_MAP_PROVIDER_URL,
        light_map_provider_attribution=conf.LIGHT_MAP_PROVIDER_ATTRIBUTION,
        ticker_items=ticker(),
        motd=motd(),
        splash=splash(),
        force_splash=conf.FORCE_SPLASH,
        show_balance=balance(),
        show_donate_tab=donate_tab(),
        show_donate_tab_content=donate_tab_content(),
        social_links=social_links(),
        show_announcements_tab=announcements_tab(),
        announcements=announcements(),
        pogosd_region=conf.POGOSD_REGION,
        display_pokemon=conf.SHOW_POKEMON_BY_DEFAULT,
        display_gyms=conf.SHOW_GYMS_BY_DEFAULT,
        display_raids=conf.SHOW_RAIDS_BY_DEFAULT,
        display_weather=conf.SHOW_WEATHER_BY_DEFAULT,
        display_parks_in_s2_cells=conf.SHOW_PARKS_IN_S2_CELLS_BY_DEFAULT,
        display_ex_gyms=conf.SHOW_EX_GYMS_BY_DEFAULT,
        display_scan_area=conf.SHOW_SCAN_AREA_BY_DEFAULT,
        display_filtered_pokemon=conf.SHOW_FILTERED_POKEMON_BY_DEFAULT,
        display_spawnpoints=conf.SHOW_SPAWNPOINTS_BY_DEFAULT,
        display_boosted_feature=display_boosted_feature(),
        show_iv_menu_item=show_iv_menu_item(),
        show_form_menu_item=show_form_menu_item(),
        init_js_vars=js_vars,
        extra_css_js=Markup(css_js)
    )


def render_worker_map():
    template = app.jinja_env.get_template('workersmap.html')
    return template.render(
        area_name=conf.AREA_NAME,
        map_center=center,
        dark_map_provider_url=conf.DARK_MAP_PROVIDER_URL,
        dark_map_provider_attribution=conf.DARK_MAP_PROVIDER_ATTRIBUTION,
        light_map_provider_url=conf.LIGHT_MAP_PROVIDER_URL,
        light_map_provider_attribution=conf.LIGHT_MAP_PROVIDER_ATTRIBUTION,
        social_links=social_links()
    )


@app.route('/')
def fullmap(map_html=render_map()):
    return map_html


@app.route('/data')
def pokemon_data():
    last_id = request.args.get('last_id', 0)
    return jsonify(get_pokemarkers(last_id))

@app.route('/weather')
def weather():
    return jsonify(get_weather())

@app.route('/gym_data')
def gym_data():
    return jsonify(get_gym_markers())

@app.route('/raid_data')
def raid_data():
    return jsonify(get_raid_markers())

@app.route('/spawnpoints')
def spawn_points():
    return jsonify(get_spawnpoint_markers())


@app.route('/pokestops')
def get_pokestops():
    return jsonify(get_pokestop_markers())

@app.route('/scan_coords')
def scan_coords():
    return jsonify(get_scan_coords())

@app.route('/ex_gym_data')
def ex_gym_data():
    return jsonify(get_ex_gyms())

@app.route('/parks')
def parks():
    return jsonify(get_all_parks())

@app.route('/cells')
def cells():
    return jsonify(get_s2_cells(level=13))

if conf.MAP_WORKERS:
    workers = Workers()

    @app.route('/workers_data')
    def workers_data():
        return jsonify(get_worker_markers(workers))


    @app.route('/workers')
    def workers_map(map_html=render_worker_map()):
        return map_html



@app.route('/report')
def report_main(area_name=conf.AREA_NAME,
                names=POKEMON,
                key=conf.GOOGLE_MAPS_KEY if conf.REPORT_MAPS else None):
    with db.session_scope() as session:
        counts = db.get_sightings_per_pokemon(session)

        count = sum(counts.values())
        counts_tuple = tuple(counts.items())
        nonexistent = [(x, names[x]) for x in range(1, 252) if x not in counts]
        del counts

        top_pokemon = list(counts_tuple[-30:])
        top_pokemon.reverse()
        bottom_pokemon = counts_tuple[:30]
        rare_pokemon = [r for r in counts_tuple if r[0] in conf.RARE_IDS]
        if rare_pokemon:
            rare_sightings = db.get_all_sightings(
                session, [r[0] for r in rare_pokemon]
            )
        else:
            rare_sightings = []
        js_data = {
            'charts_data': {
                'punchcard': db.get_punch_card(session),
                'top30': [(names[r[0]], r[1]) for r in top_pokemon],
                'bottom30': [
                    (names[r[0]], r[1]) for r in bottom_pokemon
                ],
                'rare': [
                    (names[r[0]], r[1]) for r in rare_pokemon
                ],
            },
            'maps_data': {
                'rare': [sighting_to_report_marker(s) for s in rare_sightings],
            },
            'map_center': center,
            'zoom': 13,
        }
    icons = {
        'top30': [(r[0], names[r[0]]) for r in top_pokemon],
        'bottom30': [(r[0], names[r[0]]) for r in bottom_pokemon],
        'rare': [(r[0], names[r[0]]) for r in rare_pokemon],
        'nonexistent': nonexistent
    }
    session_stats = db.get_session_stats(session)
    return render_template(
        'report.html',
        current_date=datetime.now(),
        area_name=area_name,
        area_size=area,
        total_spawn_count=count,
        spawns_per_hour=count // session_stats['length_hours'],
        session_start=session_stats['start'],
        session_end=session_stats['end'],
        session_length_hours=session_stats['length_hours'],
        js_data=js_data,
        icons=icons,
        google_maps_key=key,
    )


@app.route('/report/<int:pokemon_id>')
def report_single(pokemon_id,
                  area_name=conf.AREA_NAME,
                  key=conf.GOOGLE_MAPS_KEY if conf.REPORT_MAPS else None):
    with db.session_scope() as session:
        session_stats = db.get_session_stats(session)
        js_data = {
            'charts_data': {
                'hours': db.get_spawns_per_hour(session, pokemon_id),
            },
            'map_center': center,
            'zoom': 13,
        }
        return render_template(
            'report_single.html',
            current_date=datetime.now(),
            area_name=area_name,
            area_size=area,
            pokemon_id=pokemon_id,
            pokemon_name=POKEMON[pokemon_id],
            total_spawn_count=db.get_total_spawns_count(session, pokemon_id),
            session_start=session_stats['start'],
            session_end=session_stats['end'],
            session_length_hours=int(session_stats['length_hours']),
            google_maps_key=key,
            js_data=js_data,
        )


@app.route('/report/heatmap')
def report_heatmap():
    pokemon_id = request.args.get('id')
    with db.session_scope() as session:
        return dumps(db.get_all_spawn_coords(session, pokemon_id=pokemon_id))


def main():
    args = get_args()
    app.run(debug=args.debug, threaded=True, host=args.host, port=args.port)


if __name__ == '__main__':
    main()
