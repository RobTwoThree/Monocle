var _last_pokemon_id = 0;
var _pokemon_count = 386; // Orignally 251 for Gen 1 - 2
var _pokemon_count_gen_1 = 151;
var _pokemon_count_gen_2 = 251;
var _pokemon_count_gen_3 = 386;
var _WorkerIconUrl = 'static/monocle-icons/assets/ball.png';
var _PokestopIconUrl = 'static/monocle-icons/assets/stop.png';
var _LocationMarker;
var _LocationRadar;
// Why you stealing my code?
var _dark = L.tileLayer(_DarkMapProviderUrl, {opacity: _DarkMapOpacity, attribution: _DarkMapProviderAttribution});
var _light = L.tileLayer(_LightMapProviderUrl, {opacity: _LightMapOpacity, attribution: _LightMapProviderAttribution});
// You should ask next time.

var ultraIconSmall = new L.icon({
            iconUrl: 'static/img/ultra-ball.png',
            iconSize: [10, 10],
            iconAnchor:   [5, 5], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -15] // point from which the popup should open relative to the iconAnchor
        });
var ultraIconMedium = new L.icon({
            iconUrl: 'static/img/ultra-ball.png',
            iconSize: [20, 20],
            iconAnchor:   [10, 10], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -27] // point from which the popup should open relative to the iconAnchor
        });
var ultraIconLarge = new L.icon({
            iconUrl: 'static/img/ultra-ball.png',
            iconSize: [35, 35],
            iconAnchor:   [17.5, 17.5], // point of the icon which will correspond to marker's location
            popupAnchor:  [0, -27] // point from which the popup should open relative to the iconAnchor
        });
        
var PokemonIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, -15]
    },
    createIcon: function() {
        var div = document.createElement('div');
        var form_text = '';
        var type_icon_html = getTypeIcons(this.options.iconID);
        var boosted_icon_html = checkBoost(this.options.boost_status);
        
        typeIconDisplay();
        boostedPokemonDisplay();
        
        if ( this.options.form ) {
            form_text = '<div class="form_text">' + this.options.form + '</div>';
        }
                                
        if ( this.options.iv > 0 && this.options.iv < 80 ) {
            div.innerHTML =
                '<div class="pokemarker">' +
                    '<div class="sprite-' + getPreference("icon_theme_buttons") + '">' +
                        '<span class="sprite-' + getPreference("icon_theme_buttons") + '-' + this.options.iconID + '" />' +
                    '</div>' +
                    '<div class="iv_text">' + this.options.iv.toFixed(0) + '%</div>' +
                    '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
                    form_text +
                    '</div>';
        }else if ( this.options.iv >= 80 && this.options.iv < 90 ) {
            div.innerHTML =
                '<div class="pokemarker">' +
                    '<div class="sprite-' + getPreference("icon_theme_buttons") + '">' +
                        '<span class="sprite-' + getPreference("icon_theme_buttons") + '-' + this.options.iconID + '" />' +
                    '</div>' +
                    '<div class="iv_gt_80_text">' + this.options.iv.toFixed(0) + '%</div>' +
                    '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
                    form_text +
                    '</div>';
        }else if ( this.options.iv >= 90 && this.options.iv < 100) {
            div.innerHTML =
                '<div class="pokemarker">' +
                    '<div class="sprite-' + getPreference("icon_theme_buttons") + '">' +
                        '<span class="sprite-' + getPreference("icon_theme_buttons") + '-' + this.options.iconID + '" />' +
                    '</div>' +
                    '<div class="iv_gt_90_text">' + this.options.iv.toFixed(0) + '%</div>' +
                    '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
                    form_text +
                    '</div>';
        }else if ( this.options.iv == 100 ) {
            div.innerHTML =
                '<div class="pokemarker">' +
                '<div class="sprite-' + getPreference("icon_theme_buttons") + '">' +
                '<span class="sprite-' + getPreference("icon_theme_buttons") + '-' + this.options.iconID + '" />' +
                '</div>' +
                '<div class="iv_eq_100_img"><img class="iv_eq_100_img" src="static/img/100.png"></div>' +
                '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
                form_text +
                '</div>';
        }else{
            div.innerHTML =
                '<div class="pokemarker">' +
                    '<div class="sprite-' + getPreference("icon_theme_buttons") + '">' +
                        '<span class="sprite-' + getPreference("icon_theme_buttons") + '-' + this.options.iconID + '" />' +
                    '</div>' +
                    '<div class="remaining_text" data-expire="' + this.options.expires_at + '">' + calculateRemainingTime(this.options.expires_at) + '</div>' +
                    form_text +
                    type_icon_html +
                    boosted_icon_html +
                    '</div>';
        }
        
        return div;
    }
});

var FortIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, 5],
    },
    createIcon: function() {
        var div = document.createElement('div');
        div.innerHTML =
            '<div class="fortmarker">' +
                '<div class="fort_container">' +
                    '<img class="fort_icon" src="static/monocle-icons/forts/' + this.options.fort_team + '.png?201" />' +
                '</div>' +
                '<div class="fort_slots_container">' +
                    '<img class="fort_slots_icon" src="static/img/num_' + this.options.open_slots + '.png" />' +
                '</div>' +
            '</div>';
        return div;
    }
});

var AltFortIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, 5],
    },
    createIcon: function() {
        var div = document.createElement('div');
        var sponsor = '';
        
        // Apply sponsored/park logo settings
        sponsoredGymLogoDisplay();
        
        // Copying my code? HAHA!
        if (this.options.external_id.includes(".")) {
        } else {
            if (this.options.gym_name === "Starbucks") {
                sponsor = 'starbucks';
            } else {
                sponsor = 'sprint';
            }
        }
      
        div.innerHTML =
            '<div class="fortmarker">' +
                '<div class="fort_container">' +
                    '<img class="fort_icon" src="static/monocle-icons/forts/' + this.options.fort_team + '.png?201" />' +
                '</div>' +
                '<div class="fort_slots_container">' +
                    '<img class="fort_slots_icon" src="static/img/num_' + this.options.open_slots + '.png" />' +
                '</div>' +
            '</div>';
        if (sponsor !== '') {
            div.innerHTML +=
                '<div class="fort_sponsor_container">' +
                    '<img class="sponsor_icon_marker" src="static/monocle-icons/raids/' + sponsor + '.png" />' +
                '</div>';
        }
        return div;
    }
});

var ExGymIcon = L.Icon.extend({
    options: {
        iconSize: [20, 20],
        shadowSize: [20, 20],
        popupAnchor: [0, -10],
        className: 'ex_gym_icon'
    }
});

var ExRaidIcon = L.Icon.extend({
    options: {
        iconSize: [20, 20],
        shadowSize: [70, 70],
        popupAnchor: [0, -10],
        className: 'ex_raid_icon'
    }
});

var RaidIcon = L.Icon.extend({
    options: {
        popupAnchor: [0, -55]
    },
    createIcon: function() {
        var div = document.createElement('div');
        var sponsor = '';

        // Woah woah woah. Copying again?
        if (this.options.external_id.includes(".")) {
        } else {
            if (this.options.raid_gym_name === "Starbucks") {
                sponsor = 'starbucks';
            } else {
                sponsor = 'sprint';
            }
        }

        if (this.options.raid_pokemon_id !== 0) {
            div.innerHTML =
                '<div class="raidmarker">' +
                    '<div class="boss_raid_container">' +
                        '<img class="boss_during_raid" src="static/monocle-icons/larger-icons/' + this.options.raid_pokemon_id + '.png?100" />' +
                    '</div>' +
                    '<div class="raid_platform_container">' +
                        '<img class="pre_raid_icon" src="static/monocle-icons/raids/raid_start_level_' + this.options.raid_level + '.png?201" />' +
                    '</div>';
            if (sponsor !== '') {
                div.innerHTML +=
                    '<div class="raid_sponsor_container">' +
                        '<img class="sponsor_icon" src="static/monocle-icons/raids/' + sponsor + '.png" />' +
                    '</div>' +
                    '<div class="raid_remaining_text" data-expire1="' + this.options.raid_starts_at + '" data-expire2="' + this.options.raid_ends_at + '">' + this.options.raid_ends_at + this.options.raid_starts_at + '</div>' +
                '</div>';
            } else {
                div.innerHTML +=
                    '<div class="raid_remaining_text" data-expire1="' + this.options.raid_starts_at + '" data-expire2="' + this.options.raid_ends_at + '">' + this.options.raid_ends_at + this.options.raid_starts_at + '</div>' +
                '</div>';
            }
        } else {
            div.innerHTML =
                '<div class="raidmarker">' +
                    '<div class="pre_raid_container">' +
                        '<img class="pre_raid_icon" src="static/monocle-icons/raids/raid_level_' + this.options.raid_level + '.png?201" />' +
                    '</div>';
            if (sponsor !== '') {
                div.innerHTML +=
                    '<div class="raid_sponsor_container">' +
                        '<img class="sponsor_icon" src="static/monocle-icons/raids/' + sponsor + '.png" />' +
                    '</div>' +
                    '<div class="raid_remaining_text" data-expire1="' + this.options.raid_starts_at + '" data-expire2="' + this.options.raid_ends_at + '">' + this.options.raid_ends_at + this.options.raid_starts_at + '</div>' +
                '</div>';
            } else {
                div.innerHTML +=
                    '<div class="raid_remaining_text" data-expire1="' + this.options.raid_starts_at + '" data-expire2="' + this.options.raid_ends_at + '">' + this.options.raid_ends_at + this.options.raid_starts_at + '</div>' +
                '</div>';
            }
        }
        return div;
    }
});

var WorkerIcon = L.Icon.extend({
    options: {
        iconSize: [20, 20],
        className: 'worker-icon',
        iconUrl: _WorkerIconUrl
    }
});
var PokestopIcon = L.Icon.extend({
    options: {
        iconSize: [10, 20],
        className: 'pokestop-icon',
        iconUrl: _PokestopIconUrl
    }
});

var markers = {};
var ex_markers = {};
var weather = {};

if (_DisplaySpawnpointsLayer === 'True') {
    var overlays = {
        Pokemon_Gen1: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Pokemon_Gen2: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Pokemon_Gen3: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Gyms: L.markerClusterGroup({ disableClusteringAtZoom: 8 }),
        Raids: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Parks_In_S2_Cells: L.layerGroup({ disableClusteringAtZoom: 8 }),
        EX_Gyms: L.markerClusterGroup({ disableClusteringAtZoom: 8 }),
        Weather: L.layerGroup([]),
        ScanArea: L.layerGroup([]),
        FilteredPokemon: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Spawns: L.layerGroup([]),
        Workers: L.layerGroup([])
    };
} else {
    var overlays = {
        Pokemon_Gen1: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Pokemon_Gen2: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Pokemon_Gen3: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Gyms: L.markerClusterGroup({ disableClusteringAtZoom: 8 }),
        Raids: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
        Parks_In_S2_Cells: L.markerClusterGroup({ disableClusteringAtZoom: 8 }),
        EX_Gyms: L.markerClusterGroup({ disableClusteringAtZoom: 8 }),
        Weather: L.layerGroup([]),
        ScanArea: L.layerGroup([]),
        FilteredPokemon: L.markerClusterGroup({ disableClusteringAtZoom: 12 })
    };
}

var hidden_overlays = {
    FilteredRaids: L.markerClusterGroup({ disableClusteringAtZoom: 12 }),
    FilteredGyms: L.markerClusterGroup({ disableClusteringAtZoom: 12 })
};

function unsetHidden (event) {
    event.target.hidden = false;
}

function setHidden (event) {
    event.target.hidden = true;
}

function monitor (group, initial) {
    group.hidden = initial;
    group.on('add', unsetHidden);
    group.on('remove', setHidden);
}

monitor(overlays.Pokemon_Gen1, true)
monitor(overlays.Pokemon_Gen2, true)
monitor(overlays.Pokemon_Gen3, true)
monitor(overlays.Gyms, false)
monitor(overlays.Raids, false)
monitor(overlays.Parks_In_S2_Cells, false)
monitor(overlays.EX_Gyms, false)
monitor(overlays.Weather, false)
monitor(overlays.ScanArea, false)
monitor(overlays.FilteredPokemon, true)
monitor(hidden_overlays.FilteredRaids, false)
if (_DisplaySpawnpointsLayer === 'True') {
    monitor(overlays.Spawns, false)
    monitor(overlays.Workers, false)
}

function getPopupContent (item, boost_status) {
    var diff = (item.expires_at - new Date().getTime() / 1000);
    var minutes = parseInt(diff / 60);
    var seconds = parseInt(diff - (minutes * 60));
    var expires_at = minutes + 'm ' + seconds + 's';
    var expires_time = convertToTwelveHourTime(item.expires_at);
    var form = getForm(item.form);
    var day = ['none','day','night'];
    if (item.form > 0) {
       var pokemon_name = item.name + ' - ' + form;
    } else {
       var pokemon_name = item.name;
    }

    var content = '<div class="pokemon_popup">';
  
    content += '<div class="pokemon_popup_name"><b>' + pokemon_name + '</b> - <a href="https://pokemongo.gamepress.gg/pokemon/' + item.pokemon_id + '" target="_blank">#' + item.pokemon_id + '</a></div>';

    content += '<div class="pokemon_popup_icons"><img id="type" class="type-' + pokemon_name_type[item.pokemon_id][2] + '" src="static/img/blank_1x1.png">';

    if ( pokemon_name_type[item.pokemon_id][3] != "none" ){
        content += '<img id="type" class="type-' + pokemon_name_type[item.pokemon_id][3] + '" src="static/img/blank_1x1.png">';
    }
    content += '</div>';

    if ( boost_status != "normal" ) {
        content += '<div class="boosted_popup"><img id="weather" class="weather_' + weather[parseInt(item.pokemon_s2_cell_id)].condition + '_' + day[weather[parseInt(item.pokemon_s2_cell_id)].day] + '" src="static/img/blank_1x1.png"><div class="boosted_popup_text"><b>Boosted</b></div></div>';
    }
  
    content += '<div class="pokemon_popup_text">';
    
    if(item.atk != undefined){
        var totaliv = 100 * (item.atk + item.def + item.sta) / 45;
        content += 'IV: <b>' + totaliv.toFixed(2) + '%</b> (' + item.atk + '/' + item.def + '/' + item.sta + ')<br>';
        content += 'CP: <b>' + item.cp + '</b><br>';
        content += 'Disappears in: ' + expires_at + '<br>';
        content += 'Available until: ' + expires_time + '<br>';
        content += 'Quick: ' + item.move1 + ' ( ' + item.damage1 + ' dps )<br>';
        content += 'Charge: ' + item.move2 + ' ( ' + item.damage2 + ' dps )<br>';
    } else {
        content += 'Disappears in: ' + expires_at + '<br>';
        content += 'Available until: ' + expires_time + '<br>';
    }

    var userPref = getPreference('filter-'+item.pokemon_id);
    if (userPref == 'trash'){
        content += '<a href="#" data-pokeid="'+item.pokemon_id+'" data-newlayer="pokemon" class="popup_filter_link">Display</a>';
    }else{
        content += '<a href="#" data-pokeid="'+item.pokemon_id+'" data-newlayer="trash" class="popup_filter_link">Hide</a>';
    }
    content += '&nbsp; | &nbsp;';
    content += '<a href="https://www.google.com/maps/?daddr='+ item.lat + ','+ item.lon +'" target="_blank" title="See in Google Maps">Get directions</a>';
    content += '</div>';
    content += '</div>';
    return content;
}

function getRaidPopupContent (item) {
    var start_time = convertToTwelveHourTime(item.raid_battle);
    var end_time = convertToTwelveHourTime(item.raid_end);
  
    var diff = (item.raid_battle - new Date().getTime() / 1000);
    var minutes = parseInt(diff / 60);
    var seconds = parseInt(diff - (minutes * 60));
    if (diff < 0) {
        var raid_starts_at = 'In Progress';
        if (item.raid_pokemon_id === 0) {
            var raid_boss_name = 'TBD';
            var raid_boss_cp = 'TBD';
            var raid_boss_move_1 = 'TBD';
            var raid_boss_move_2 = 'TBD';
        }else{
            var raid_boss_name = item.raid_pokemon_name + ' (#' + item.raid_pokemon_id + ')';
            var raid_boss_cp = item.raid_pokemon_cp;
            var raid_boss_move_1 = item.raid_pokemon_move_1;
            var raid_boss_move_2 = item.raid_pokemon_move_2;
        }
    }else{
        var raid_starts_at = minutes + 'm ' + seconds + 's';
        var raid_boss_name = 'TBD';
        var raid_boss_cp = 'TBD';
        var raid_boss_move_1 = 'TBD';
        var raid_boss_move_2 = 'TBD';
    }
    var diff = (item.raid_end - new Date().getTime() / 1000);
    if (diff < 0) {
        var raid_ends_at = 'Ended';
    } else {
        var minutes = parseInt(diff / 60);
        var seconds = parseInt(diff - (minutes * 60));
        var raid_ends_at = minutes + 'm ' + seconds + 's';
    }
  
    var content = '<div class="raid-popup">';
    if (item.raid_pokemon_id !== 0) {
        content += '<div class="raid_popup-icon_container"><img class="boss-icon" src="static/monocle-icons/larger-icons/' + item.raid_pokemon_id + '.png?100">';
        if (item.gym_team > 0) {
            if (item.gym_team === 1 ) {
                content += '<img class="team-logo" src="static/img/mystic.png">';
            } else if (item.gym_team === 2) {
                content += '<img class="team-logo" src="static/img/valor.png">';
            } else if (item.gym_team === 3) {
                content += '<img class="team-logo" src="static/img/instinct.png">';
            }
        }
        content += '</div>';
    } else {
        content += '<div class="raid_popup-icon_container"><img class="egg-icon" src="static/monocle-icons/raids/egg_level_' + item.raid_level + '.png">';
        if (item.gym_team > 0) {
            if (item.gym_team === 1 ) {
                content += '<img class="team-logo" src="static/img/mystic.png">';
            } else if (item.gym_team === 2) {
                content += '<img class="team-logo" src="static/img/valor.png">';
            } else if (item.gym_team === 3) {
                content += '<img class="team-logo" src="static/img/instinct.png">';
            }
        }
        content += '</div>';
    }
    
    if (item.raid_level === 5) {
        content += '<b>Level 5 Raid</b>'
    } else if (item.raid_level === 4) {
        content += '<b>Level 4 Raid</b>'
    } else if (item.raid_level === 3 ) {
        content += '<b>Level 3 Raid</b>'
    } else if (item.raid_level === 2 ) {
        content += '<b>Level 2 Raid</b>'
    } else if (item.raid_level === 1 ) {
        content += '<b>Level 1 Raid</b>'
    }
    if (item.gym_name != null) {
        content += '<br><b>' + item.gym_name + ' Gym</b>';
        if ((item.image_url !== null) && (getPreference("gym_landmark") === "display")) {
             if (item.image_url !== '') { // Check if image_url is blank
                 content += '<br><div class="gym_image_container"><img class="gym_image" src="' + item.image_url + '"></div>';
             }
        }
      
        // Copying my code?
        if (!item.external_id.includes(".")) {
            if (item.gym_name === "Starbucks") {
                content += '<br><img class="sponsor_icon" src="static/monocle-icons/raids/starbucks.png">';
            } else {
                content += '<br><img class="sponsor_icon" src="static/monocle-icons/raids/sprint.png">';
            }
        }
      
        if (item.gym_team === 0) {
            content += '<br><b>An unoccupied gym</b>';
        } else if (item.gym_team === 1 ) {
            content += '<br><b>Occupied by Team Mystic</b>';
        } else if (item.gym_team === 2) {
            content += '<br><b>Occupied by Team Valor</b>';
        } else if (item.gym_team === 3) {
            content += '<br><b>Occupied by Team Instinct</b>';
        }
    }
    content += '<br><b>Boss:</b> ' + raid_boss_name +
               '<br><b>CP:</b> ' + raid_boss_cp +
               '<br><b>Quick Move:</b> ' + raid_boss_move_1 +
               '<br><b>Charge Move:</b> ' + raid_boss_move_2 +
               '<br><b>Raid Starts:</b> ' + start_time +
               '<br><b>Raid Ends:</b> ' + end_time;
  
    if ((item.raid_level >= 3) && (item.raid_pokemon_id !== 0)) {
         content += '<br><b>Weak Against:</b><br><img src="static/monocle-icons/raids/counter-' + item.raid_pokemon_id + '.png">';
    }
    content += '<br><br><a href="https://www.google.com/maps/?daddr='+ item.lat + ','+ item.lon +'" target="_blank" title="See in Google Maps">Get Directions</a>';
    if (item.raid_pokemon_id !== 0) {
        content += '&nbsp; | &nbsp;';
        content += '<a href="https://pokemongo.gamepress.gg/pokemon/' + item.raid_pokemon_id + '#raid-boss-counters" target="_blank" title="Raid Boss Counters">Raid Boss Counters</a>';
    }
    content += '</div>'
    return content;
}

function getFortPopupContent (item) {
    var hours = parseInt(item.time_occupied / 3600);
    var minutes = parseInt((item.time_occupied / 60) - (hours * 60));
    var seconds = parseInt(item.time_occupied - (minutes * 60) - (hours * 3600));
    var fort_occupied_time = hours + 'h ' + minutes + 'm ' + seconds + 's';
    var content = '<div class="fort-popup">'
  
    if (item.pokemon_id !== 0) {
        content += '<div class="fort_popup-icon_container"><img class="guard-icon" src="static/monocle-icons/larger-icons/' + item.pokemon_id + '.png?100">';
    }
    if (item.team === 0) {
        content += '<b>An empty Gym!</b>';
        content += '<br><b>' + item.gym_name + ' Gym</b><br>';
        if ((item.image_url !== null) && (getPreference("gym_landmark") === "display")) {
             if (item.image_url !== '') { // Check if image_url is blank
                 content += '<br><div class="gym_image_container"><img class="gym_image" src="' + item.image_url + '"></div>';
             }
        }
      
        // Copying my code? HAHA!
        if (!item.external_id.includes(".")) {
            if (item.gym_name === "Starbucks") {
                content += '<br><img class="sponsor_icon" src="static/monocle-icons/raids/starbucks.png">';
            } else {
                content += '<br><img class="sponsor_icon" src="static/monocle-icons/raids/sprint.png">';
            }
        }

        content += '<br>Last changed: ' + this.convertToTwelveHourTime(item.last_modified);
    }
    else {
        if (item.team === 1) {
            var team_logo = 'mystic.png';
            var team_name = 'Mystic';
        } else if (item.team === 2) {
            var team_logo = 'valor.png';
            var team_name = 'Valor';
        } else if (item.team === 3) {
            var team_logo = 'instinct.png';
            var team_name = 'Instinct';
        }
        content += '<img class="team-logo" src="static/img/' + team_logo + '"></div>';
        if (item.gym_name != null) {
            content += '<b>' + item.gym_name + ' Gym</b>';
            if ((item.image_url !== null) && (getPreference("gym_landmark") === "display")) {
                 if (item.image_url !== '') { // Check if image_url is blank
                     content += '<br><div class="gym_image_container"><img class="gym_image" src="' + item.image_url + '"></div>';
                 }
            }

            // Copying my code? HAHA!
            if (!item.external_id.includes(".")) {
                if (item.gym_name === "Starbucks") {
                    content += '<br><img class="sponsor_icon" src="static/monocle-icons/raids/starbucks.png">';
                } else {
                    content += '<br><img class="sponsor_icon" src="static/monocle-icons/raids/sprint.png">';
                }
            }
          
            content += '<br><b>is currently occupied by:</b>';
        } else {
            content += '<br><b>Gym is currently occupied by:</b>';
        }
        content += '<br><b>Team ' + team_name + '</b>'

        if (item.slots_available !== null) {
            content += '<br>Guarding Pokemon: ' + item.pokemon_name + ' (#' + item.pokemon_id + ')' +
                       '<br>Slots Open: <b>' + item.slots_available + '/6</b>' +
                       '<br>Occupied time: ' + fort_occupied_time +
                       '<br>Last changed: ' + this.convertToTwelveHourTime(item.last_modified);
        } else {
            content += '<br>Guarding Pokemon: ' + item.pokemon_name + ' (#' + item.pokemon_id + ')' +
                       '<br>Slots Open: <b>Unknown</b>' +
                       '<br>Occupied time: <b>Unknown</b>' +
                       '<br><b>*Data not available</b>';
        }
    }
    content += '<br><a href=https://www.google.com/maps/?daddr='+ item.lat + ','+ item.lon +' target="_blank" title="See in Google Maps">Get directions</a>';
    content += '</div>'

    return content;
}

function getOpacity (diff) {
    if (diff > 300 || getPreference('FIXED_OPACITY') === "1") {
        return 1;
    }
    return 0.5 + diff / 600;
}

function getForm (f) {
    if ((f !== null) && f !== 0) {
        return String.fromCharCode(f + 64);
    }
    return "";
}

function PokemonMarker (raw) {
    if (getPreference("SHOW_IV") === "1"){
        var totaliv = 100 * (raw.atk + raw.def + raw.sta) / 45;
    }else{
        var totaliv = 0;
    }
  
    boostedPokemonDisplay();
  
    // I know you stole this stuff from me
    var unown_letter = getForm(raw.form);
  
    // Don't call boost status function if 0
    if ( ( parseInt(raw.pokemon_s2_cell_id) === 0 ) || ( raw.pokemon_s2_cell_id === null ) ) {
        var boost_status = 'normal'
    } else {
        var boost_status = getBoostStatus(raw);
    }
  
    var icon = new PokemonIcon({iconID: raw.pokemon_id, iv: totaliv, cp: raw.cp, form: unown_letter, expires_at: raw.expires_at, boost_status: boost_status});
    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1});
    var intId = parseInt(raw.id.split('-')[1]);
    if (_last_pokemon_id < intId){
        _last_pokemon_id = intId;
    }

    if (raw.trash) {
        marker.overlay = 'FilteredPokemon';
    } else {
        if ( (raw.pokemon_id >= 1) && (raw.pokemon_id <= 151) ) {
            marker.overlay = 'Pokemon_Gen1';
        } else if ( (raw.pokemon_id >= 152) && (raw.pokemon_id <= 251)) {
            marker.overlay = 'Pokemon_Gen2';
        } else if ( (raw.pokemon_id >= 252) && (raw.pokemon_id <= 386)) {
            marker.overlay = 'Pokemon_Gen3';
        }
    }
    var userPreference = getPreference('filter-'+raw.pokemon_id);
    if (userPreference === 'pokemon'){
        if ( (raw.pokemon_id >= 1) && (raw.pokemon_id <= 151) ) {
            marker.overlay = 'Pokemon_Gen1';
        } else if ( (raw.pokemon_id >= 152) && (raw.pokemon_id <= 251)) {
            marker.overlay = 'Pokemon_Gen2';
        } else if ( (raw.pokemon_id >= 252) && (raw.pokemon_id <= 386)) {
            marker.overlay = 'Pokemon_Gen3';
        }
    }else if (userPreference === 'trash'){
        marker.overlay = 'FilteredPokemon';
    }else if (userPreference === 'hidden'){
        marker.overlay = 'Hidden';
    }
    marker.raw = raw;
    markers[raw.id] = marker;
    marker.on('popupopen',function popupopen (event) {
        event.popup.options.autoPan = true; // Pan into view once
        event.popup.setContent(getPopupContent(event.target.raw, boost_status));
        event.target.popupInterval = setInterval(function () {
            event.popup.setContent(getPopupContent(event.target.raw, boost_status));
            event.popup.options.autoPan = false; // Don't fight user panning
        }, 1000);
    });
    marker.on('popupclose', function (event) {
        clearInterval(event.target.popupInterval);
    });
    marker.setOpacity(getOpacity(marker.raw));
    marker.opacityInterval = setInterval(function () {
        if (marker.overlay === "Hidden" || overlays[marker.overlay].hidden) {
            return;
        }
        var diff = marker.raw.expires_at - new Date().getTime() / 1000;
        if (diff > 0) {
            marker.setOpacity(getOpacity(diff));
        } else {
            if ( marker.overlay === "Pokemon_Gen1" ) {
                overlays.Pokemon_Gen1.removeLayer(marker);
                overlays.Pokemon_Gen1.refreshClusters(marker);
            }
            
            if ( marker.overlay === "Pokemon_Gen2" ) {
                overlays.Pokemon_Gen2.removeLayer(marker);
                overlays.Pokemon_Gen2.refreshClusters(marker);
            }
            
            if ( marker.overlay === "Pokemon_Gen3" ) {
                overlays.Pokemon_Gen3.removeLayer(marker);
                overlays.Pokemon_Gen3.refreshClusters(marker);
            }
            
            if ( marker.overlay === "FilteredPokemon" ) {
                overlays.FilteredPokemon.removeLayer(marker);
                overlays.FilteredPokemon.refreshClusters(marker);
            }
            
            markers[marker.raw.id] = undefined;
            clearInterval(marker.opacityInterval);
        }
    }, 2500);
    marker.bindPopup();
    return marker;
}

function FortMarker (raw) {
    if (raw.slots_available !== null) {
        var open_slots = raw.slots_available;
    } else {
        var open_slots = 9999;
    }
  
    var current_time = new Date();
    var current_hour = current_time.getHours();
    var gym_start_hour = 20; // Start at 8pm
    var gym_end_hour = 4; // End at 4am
  
    if (gym_end_hour < gym_start_hour) { // Time span goes past midnight
        if ((current_hour >= gym_start_hour && current_hour <= 23) || (current_hour >= 0 && current_hour <= gym_end_hour)) {
            var fort_icon = new AltFortIcon({fort_team: raw.team, open_slots: open_slots, gym_name: raw.gym_name, external_id: raw.external_id});
        } else {
            var fort_icon = new FortIcon({fort_team: raw.team, open_slots: open_slots, gym_name: raw.gym_name});
        }
    
    } else {
        if (current_hour >= gym_start_hour && current_hour <= gym_end_hour) {
            var fort_icon = new AltFortIcon({fort_team: raw.team, open_slots: open_slots, gym_name: raw.gym_name, external_id: raw.external_id});
        } else {
            var fort_icon = new FortIcon({fort_team: raw.team, open_slots: open_slots, gym_name: raw.gym_name});
        }
    }

    var fort_marker = L.marker([raw.lat, raw.lon], {icon: fort_icon, opacity: 1, zIndexOffset: 1000});
    var selectedGym = getPreference('gym_selection');
  
    if (selectedGym === raw.team.toString()) {
        fort_marker.overlay = 'Gyms';
    } else if (selectedGym == 4) {
        fort_marker.overlay = 'Gyms';
    } else {
        fort_marker.overlay = 'FilteredGyms';
    }
  
    fort_marker.raw = raw;
    markers[raw.id] = fort_marker;
    fort_marker.on('popupopen',function popupopen (event) {
        event.popup.options.autoPan = true; // Pan into view once
        event.popup.setContent(getFortPopupContent(event.target.raw));
        event.popup.options.autoPan = false; // Don't fight user panning
    });

    fort_marker.bindPopup();
    return fort_marker;
}

function RaidMarker (raw) {
    var raid_boss_icon = new RaidIcon({raid_pokemon_id: raw.raid_pokemon_id, raid_level: raw.raid_level, raid_ends_at: raw.raid_end, raid_starts_at: raw.raid_battle, raid_gym_name: raw.gym_name, external_id: raw.external_id});
    var raid_marker = L.marker([raw.lat, raw.lon], {icon: raid_boss_icon, opacity: 1, zIndexOffset: 5000});

    if (raw.hide_raid) {
        raid_marker.overlay = 'FilteredRaids';
    } else {
        raid_marker.overlay = 'Raids';
    }
    var userPreference = getPreference('raid_filter-'+raw.raid_level);
    if (userPreference === 'display_raid'){
        raid_marker.overlay = 'Raids';
    }else if (userPreference === 'hide_raid'){
        raid_marker.overlay = 'FilteredRaids';
    }

    raid_marker.sponsor = getSponsorGymType(raw);
    raid_marker.raw = raw;
    markers[raw.id] = raid_marker;
    raid_marker.on('popupopen',function popupopen (event) {
        event.popup.options.autoPan = true; // Pan into view once
        event.popup.setContent(getRaidPopupContent(event.target.raw));
        event.target.popupInterval = setInterval(function () {
            event.popup.setContent(getRaidPopupContent(event.target.raw));
            event.popup.options.autoPan = false; // Don't fight user panning
        }, 1000);
    });
    raid_marker.on('popupclose', function (event) {
        clearInterval(event.target.popupInterval);
    });

    raid_marker.opacityInterval = setInterval(function () {
        if (raid_marker.overlay === "FilteredRaids") {
            return;
        }
        var diff = (raid_marker.raw.raid_end - new Date().getTime() / 1000);
        var ex_raid_marker_id = "ex-" + raid_marker.raw.id;
        if ( (raid_marker.raw.id != undefined ) && ( diff < 0 ) ) { // Raid ended, remove markers
            var expired_ex_marker = ex_markers[ex_raid_marker_id];
            
            raid_marker.removeFrom(overlays.Raids);
            markers[raid_marker.raw.id] = undefined;
            
            if ( expired_ex_marker != undefined ) { // Raid ended, remove EX Eligible Raid markers
                ex_markers[ex_raid_marker_id].removeFrom(overlays.EX_Gyms);
                ex_markers[ex_raid_marker_id] = undefined;
            }
            
            clearInterval(raid_marker.opacityInterval);
        }
    }, 2500);
  
    raid_marker.bindPopup();
    return raid_marker;
}

function ExGymMarker (raw) {
    var icon = new ExGymIcon({iconUrl: 'static/img/blank_1x1.png', shadowUrl: 'static/img/hollow_boosted.png'});
    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1, pane: 'sub_shadow'});
  
    marker.raw = raw;
    ex_markers[raw.id] = marker;

    marker.on('popupopen',function popupopen (event) {
        var content = ''
        content += '<div class="ex_gym_popup">';
        content += '<b>' + raw.name + ' Gym</b>';
        content += '<br>has been idenified as being an <br>EX Raid Eligible Gym.';
        content += '<br><br><a href=https://www.google.com/maps/?daddr='+ raw.lat + ','+ raw.lon +' target="_blank" title="See in Google Maps">Get directions</a>';
        content += '</div>';
        event.popup.setContent(content);
    });
    marker.bindPopup();
    return marker;
}

function ExRaidMarker (raw) {
    var icon = new ExRaidIcon({iconUrl: 'static/img/blank_1x1.png', shadowUrl: 'static/img/ex_raid_star.png'});
    var marker = L.marker([raw.lat, raw.lon], {icon: icon, opacity: 1, pane: 'at_shadow'});
  
    marker.raw = raw;
    ex_markers[raw.id] = marker;
  
    marker.on('popupopen',function popupopen (event) {
        var content = ''
        content += '<div class="ex_gym_popup">';
        content += 'The raid at the';
        content += '<br><b>' + raw.name + ' Gym</b><br>';
        content += 'has been idenified as being an <br>EX Raid Eligible Raid';
        content += '<br><br><a href="#" data-action="display" class="ex_raid_popup_show_raids">Show Current Raids</a>';
        content += '&nbsp; | &nbsp;';
        content += '<a href="#" data-action="hide" class="ex_raid_popup_show_raids">Hide Current Raids</a>';
        content += '<br><br><a href=https://www.google.com/maps/?daddr='+ raw.lat + ','+ raw.lon +' target="_blank" title="See in Google Maps">Get directions</a>';
        content += '</div>';
        event.popup.setContent(content);
    });
    marker.bindPopup();
    return marker;
}

function WorkerMarker (raw) {
    var icon = new WorkerIcon();
    var marker = L.marker([raw.lat, raw.lon], {icon: icon});
    var circle = L.circle([raw.lat, raw.lon], 70, {weight: 2});
    var group = L.featureGroup([marker, circle])
        .bindPopup('<b>Worker ' + raw.worker_no + '</b><br>time: ' + raw.time + '<br>speed: ' + raw.speed + '<br>total seen: ' + raw.total_seen + '<br>visits: ' + raw.visits + '<br>seen here: ' + raw.seen_here);
    return group;
}

function addPokemonToMap (data, map) {
    data.forEach(function (item) {
        // Already placed? No need to do anything, then
        if (item.id in markers) {
            return;
        }
        var marker = PokemonMarker(item);
        if (marker.overlay !== "Hidden"){
            marker.addTo(overlays[marker.overlay]);
        }
    });
    updateTime();
    if (_updateTimeInterval === null){
        _updateTimeInterval = setInterval(updateTime, 1000);
    }
}

// Count on you to copy more of my code.
function addGymCounts (data) {
    var team_count = new gymCounter();
    var instinct_container = $('.instinct-gym-filter[data-value="3"]')
    var valor_container = $('.valor-gym-filter[data-value="2"]')
    var mystic_container = $('.mystic-gym-filter[data-value="1"]')
    var empty_container = $('.empty-gym-filter[data-value="0"]')
    var total_container = $('.all-gyms-filter[data-value="4"]')
  
    team_count.add(data);
  
    mystic_container.html(team_count.mystic);
    valor_container.html(team_count.valor);
    instinct_container.html(team_count.instinct);
    empty_container.html(team_count.empty);
    total_container.html(team_count.total);
}

function gymCounter() {
    this.mystic = 0;
    this.valor = 0;
    this.instinct = 0;
    this.empty = 0;
    this.total = 0;
}

gymCounter.prototype.add = function(data) {
    data.forEach(function(item) {
        if ( item.team == 1 ) {
            ++this.mystic;
        } else if ( item.team == 2 ) {
            ++this.valor;
        } else if ( item.team == 3 ) {
            ++this.instinct;
        } else {
            ++this.empty;
        }
        this.total = this.mystic + this.valor + this.instinct + this.empty;
    }, this);
};

function addGymsToMap (data, map) {
    data.forEach(function (item) {
        // No change since last time? Then don't do anything
        var existing = markers[item.id];
        
        if (typeof existing !== 'undefined') {
            if (existing.raw.sighting_id === item.sighting_id) {
                return;
            }
            existing.removeFrom(overlays.Gyms);
            markers[item.id] = undefined;
        }
        
        // Check local storage for last setting
        var mysticPref = getPreference('mystic_gym_filter');
        var valorPref = getPreference('valor_gym_filter');
        var instinctPref = getPreference('instinct_gym_filter');
        var emptyPref = getPreference('empty_gym_filter');

        if ((mysticPref === "active")  && (item.team === 1)) {
            marker = FortMarker(item);
            marker.addTo(overlays.Gyms);
            marker.overlay = "Gyms";
        } else if ((valorPref === "active")  && (item.team === 2)) {
            marker = FortMarker(item);
            marker.addTo(overlays.Gyms);
            marker.overlay = "Gyms";
        } else if ((instinctPref === "active")  && (item.team === 3)) {
            marker = FortMarker(item);
            marker.addTo(overlays.Gyms);
            marker.overlay = "Gyms";
        } else if ((emptyPref === "active")  && (item.team === 0)) {
            marker = FortMarker(item);
            marker.addTo(overlays.Gyms);
            marker.overlay = "Gyms";
        } else {
            marker = FortMarker(item);
            marker.addTo(hidden_overlays.FilteredGyms);
            marker.overlay = "FilteredGyms";
        }
    });
}

function addRaidsToMap (data, map) {
    data.forEach(function (item) {
        // If existing, go ahead and remove marker and refresh it just in case Boss Pokemon is revealed
        var existing = markers[item.id];
        if (typeof existing !== 'undefined') {
            existing.removeFrom(overlays.Raids);
            markers[item.id] = undefined;
        }
        
        var levelPreference = getPreference('raid_filter-'+item.raid_level);
        var sponsorPreference = getPreference('sponsored_filter');
        var sponsor_type = getSponsorGymType(item);
        if ((levelPreference === 'hide_raid') || ((sponsor_type === 'non-sponsored') && (sponsorPreference === 'sponsored_only'))) {
            marker = RaidMarker(item);
            marker.addTo(hidden_overlays.FilteredRaids);
        } else {
            marker = RaidMarker(item);
            marker.addTo(overlays.Raids);

            var ex_fort_id = 'ex-fort-' + item.fort_id;
            var ex_item = {};

            if (ex_markers[ex_fort_id])
            {
                ex_item.id = 'ex-raid-' + item.fort_id;
                ex_item.fort_id = item.fort_id;
                ex_item.name = item.gym_name;
                ex_item.lat = item.lat;
                ex_item.lon = item.lon;
                
                // If marker already exists don't do anything
                if (ex_item.id in ex_markers) {
                } else {
                    ex_marker = ExRaidMarker(ex_item); // CREATE NEW MARKER FOR EX ELIGIBLES
                    ex_marker.addTo(overlays.EX_Gyms);
                }
            }

        }
    });
}

function addSpawnsToMap (data, map) {
    data.forEach(function (item) {
        var circle = L.circle([item.lat, item.lon], 5, {weight: 2});
        var time = '??';
        if (item.despawn_time != null) {
            time = '' + Math.floor(item.despawn_time/60) + 'min ' +
                   (item.despawn_time%60) + 'sec';
        }
        else {
            circle.setStyle({color: '#f03'})
        }
        circle.bindPopup('<b>Spawn ' + item.spawn_id + '</b>' +
                         '<br/>despawn: ' + time +
                         '<br/>duration: '+ (item.duration == null ? '30mn' : item.duration + 'mn') +
                         '<br>=&gt; <a href=https://www.google.com/maps/?daddr='+ item.lat + ','+ item.lon +' target="_blank" title="See in Google Maps">Get directions</a>');
        circle.addTo(overlays.Spawns);
    });
}

function addPokestopsToMap (data, map) {
    data.forEach(function (item) {
        var icon = new PokestopIcon();
        var marker = L.marker([item.lat, item.lon], {icon: icon});
        marker.raw = item;
        marker.bindPopup('<b>Pokestop: ' + item.external_id + '</b>' +
                         '<br><a href=https://www.google.com/maps/?daddr='+ item.lat + ','+ item.lon +' target="_blank" title="See in Google Maps">Get directions</a>');
        marker.addTo(overlays.Pokestops);
    });
}

function addWeatherToMap (data, map) {
    overlays.Weather.clearLayers();
    data.forEach(function (item) {
        var color = 'grey';
        var conditions = ['Extreme', 'Clear', 'Rainy', 'Partly Cloudy', 'Overcast', 'Windy', 'Snow', 'Fog'];
        
        weather[item.s2_cell_id] = item;

        if ( localStorage.getItem(item.id) === null ) {
            localStorage.setItem(item.id, item.updated); // Save initial last update to local storage
        } else {
            stored_last_updated = localStorage.getItem(item.id);
            if ( ( item.updated != null ) && ( stored_last_updated != item.updated ) ) {
                var currentZoom = map.getZoom();
                var currentCenter = map.getCenter();
                
                localStorage.setItem(item.id, item.updated);
                localStorage.setItem(_PoGoSDRegion+"lastZoom", currentZoom);
                localStorage.setItem(_PoGoSDRegion+"lastCenterLat", currentCenter.lat);
                localStorage.setItem(_PoGoSDRegion+"lastCenterLng", currentCenter.lng);
                location.reload();
            }
        }
        
        if (item.alert_severity > 0) {
            color = 'red';
        }
        else {
            var colors = ['#c6c6c6', '#fcfacc', '#859db2', '#c9dae5', '#d0dbe2', '#fffee5', '#e3e2ff', '#a6bad8'];
            color = colors[item.condition];
        }
        var day = 'day';
        if (item.day === 2) {
            day = 'night';
        }
        L.polygon(item.coords, {'color': color}, {'opacity': 0.5}).addTo(overlays.Weather);

        var weatherMarker = L.icon({
            iconUrl: 'static/img/blank_1x1.png',
            iconSize: [1,1],
            shadowUrl: 'static/img/weather_' + item.condition + '_' + day + '.png',
            shadowSize: [256,256]
                 });
        var weatherMediumMarker = L.icon({
            iconUrl: 'static/img/blank_1x1.png',
            iconSize: [1,1],
            shadowUrl: 'static/img/weather_' + item.condition + '_' + day + '.png',
            shadowSize: [128,128]
                 });
        var weatherSmallMarker = L.icon({
            iconUrl: 'static/img/blank_1x1.png',
            iconSize: [1,1],
            shadowUrl: 'static/img/weather_' + item.condition + '_' + day + '.png',
            shadowSize: [64,64]
                 });
        var weatherTinyMarker = L.icon({
            iconUrl: 'static/img/blank_1x1.png',
            iconSize: [1,1],
            shadowUrl: 'static/img/weather_' + item.condition + '_' + day + '.png',
            shadowSize: [32,32]
                 });
        var weatherIcon = L.icon({
            iconUrl: 'static/img/weather_icon_' + item.condition + '_' + day + '.png',
            iconSize: [64,64],
            iconAnchor: [64,64],
            popupAnchor: [-32,-64]
                 });
        var weatherMediumIcon = L.icon({
            iconUrl: 'static/img/weather_icon_' + item.condition + '_' + day + '.png',
            iconSize: [32,32],
            iconAnchor: [32,32],
            popupAnchor: [-16,-32]
                 });
        var weatherSmallIcon = L.icon({
            iconUrl: 'static/img/weather_icon_' + item.condition + '_' + day + '.png',
            iconSize: [16,16],
            iconAnchor: [16,16],
            popupAnchor: [-8,-16]
                 });

        var weatherOverlay = L.marker([item.center[0],item.center[1]], {icon: weatherMarker, opacity: 0.5}).addTo(overlays.Weather);
        var weatherIconMarker = L.marker([item.coords[2][0],item.coords[2][1]],{icon: weatherIcon}).addTo(overlays.Weather);

        map.on('zoomend', function() {
            var currentZoom = map.getZoom();

            //Set marker size when zooming in and out
            if (currentZoom > 11) {
                weatherOverlay.setIcon(weatherMarker);
                weatherIconMarker.setIcon(weatherIcon);
            } else if (currentZoom === 12) {
                weatherOverlay.setIcon(weatherMediumMarker);
                weatherIconMarker.setIcon(weatherIcon);
            } else if (currentZoom === 11) {
                weatherOverlay.setIcon(weatherSmallMarker);
                weatherIconMarker.setIcon(weatherMediumIcon);
            } else {
                weatherOverlay.setIcon(weatherTinyMarker);
                weatherIconMarker.setIcon(weatherSmallIcon);
            }
        });

        if ( item.condition == 0 ) {
            var weather_icon_bg = 'extreme_icon';
        } else {
            var weather_icon_bg = 'icon';
        }
        weatherIconMarker.bindPopup(
            '<div class="weather_popup">' +
                '<div class="weather_popup_' + weather_icon_bg + '"><img src="static/img/weather_' + item.condition + '_' + day + '.png">' + '</div>' +
                '<div class="weather_popup_text"><h4>' + conditions[item.condition] + '</div>' +
                '<hr>' +
                '<div class="weather_popup_text">BOOSTED TYPES</div>' +
                '<div class="weather_popup_boost_types"><img src="static/img/boost-' + item.condition + '.png"></img></div>' +
                '<div class="weather_popup_text">These Pokemon types are stronger, appear more frequently, and give bonus Stardust when caught</div>' +
            '</div>'
        );
    });

}

function addScanAreaToMap (data, map) {
    data.forEach(function (item) {
        if (item.type === 'scanarea'){
            L.polyline(item.coords).addTo(overlays.ScanArea);
        } else if (item.type === 'scanblacklist'){
            L.polyline(item.coords, {'color':'red'}).addTo(overlays.ScanArea);
        }
    });
}

function addWorkersToMap (data, map) {
    overlays.Workers.clearLayers()
    data.forEach(function (item) {
        marker = WorkerMarker(item);
        marker.addTo(overlays.Workers);
    });
}

function addParksToMap (data, map) {
    data.forEach(function (item) {
        L.polygon(item.coords, {'color': 'limegreen'}).addTo(overlays.Parks_In_S2_Cells);
    });
}

function addCellsToMap (data, map) {
    data.forEach(function (item) {
        L.polygon(item.coords, {'color': 'grey'}).addTo(overlays.Parks_In_S2_Cells);
    });
}

function addExGymsToMap (data, map) {
    data.forEach(function (item) {
        // If marker already exists don't do anything
        if (item.id in ex_markers) {
            return;
        }
        var marker = ExGymMarker(item); // CREATE NEW MARKER FOR EX ELIGIBLES
        marker.addTo(overlays.EX_Gyms);
    });
}

function addExRaidsToMap (data, map) {
    data.forEach(function (item) {
        var raid_id = 'raid-' + item.fort_id;
        var ex_item = {};
        if (markers[raid_id])
        {
            ex_item.id = 'ex-raid-' + item.fort_id;
            ex_item.fort_id = item.fort_id;
            ex_item.name = item.name;
            ex_item.lat = item.lat;
            ex_item.lon = item.lon;
            
            // If marker already exists don't do anything
            if (ex_item.id in ex_markers) {
            } else {
                var ex_marker = ExRaidMarker(ex_item); // CREATE NEW MARKER FOR EX ELIGIBLES
                ex_marker.addTo(overlays.EX_Gyms);
            }
        }

    });
}

function getPokemon () {
    if (overlays.Pokemon_Gen1.hidden && overlays.Pokemon_Gen2.hidden && overlays.Pokemon_Gen3.hidden && overlays.FilteredPokemon.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/data?last_id='+_last_pokemon_id, function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addPokemonToMap(data, map);
        if ( !overlays.Pokemon_Gen1.hidden ) {
            overlays.Pokemon_Gen1.refreshClusters();
        }
        if ( !overlays.Pokemon_Gen2.hidden ) {
            overlays.Pokemon_Gen2.refreshClusters();
        }
        if ( !overlays.Pokemon_Gen3.hidden ) {
            overlays.Pokemon_Gen3.refreshClusters();
        }
    });
}

function getGyms () {
    if (overlays.Gyms.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/gym_data', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addGymsToMap(data, map);
        addGymCounts(data);
    });
}

function getRaids () {
    if (hidden_overlays.FilteredRaids.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/raid_data', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addRaidsToMap(data, map);
    });
}

function getSpawnPoints() {
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/spawnpoints', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addSpawnsToMap(data, map);
    });
}

function getPokestops() {
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/pokestops', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addPokestopsToMap(data, map);
    });
}

function getWeather() {
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/weather', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addWeatherToMap(data, map);
    });
}

function getScanAreaCoords() {
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/scan_coords', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addScanAreaToMap(data, map);
    });
}

function getWorkers() {
    if (overlays.Workers.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/workers_data', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addWorkersToMap(data, map);
    });
}

function getParks() {
    if (overlays.Parks_In_S2_Cells.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/parks', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addParksToMap(data, map);
    });
}

function getCells() {
    if (overlays.Parks_In_S2_Cells.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/cells', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addCellsToMap(data, map);
    });
}

function getExGyms() {
    if (overlays.EX_Gyms.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/ex_gym_data', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        addExGymsToMap(data, map);
        //addExRaidsToMap(data, map);
    });
}

function getExRaids() {
    if (overlays.EX_Gyms.hidden) {
        return;
    }
    new Promise(function (resolve, reject) {
        $.get(_PoGoSDRegion+'/ex_gym_data', function (response) {
            resolve(response);
        });
    }).then(function (data) {
        //addExGymsToMap(data, map);
        addExRaidsToMap(data, map);
    });
}

var params = {};
window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
                             params[key] = value;
                             });
if(parseFloat(params.lat) && parseFloat(params.lon)){
    var map = new L.Map('main-map', {
                      center: [params.lat, params.lon],
                      maxZoom: 18,
                      zoom: params.zoom || 16
                      });
    map.createPane('sub_shadow');
    map.createPane('at_shadow');
    map.getPane('sub_shadow').style.zIndex = 450;
    map.getPane('at_shadow').style.zIndex = 500;

} else {
    if ( ( localStorage.getItem(_PoGoSDRegion+"lastZoom") === null ) || ( localStorage.getItem(_PoGoSDRegion+"lastCenterLat") === null ) || ( localStorage.getItem(_PoGoSDRegion+"lastCenterLng") === null ) ) {
        var map = L.map('main-map', {
                    preferCanvas: true,
                    maxZoom: 18,}).setView(_MapCoords, 16);

        map.createPane('sub_shadow');
        map.createPane('at_shadow');
        map.getPane('sub_shadow').style.zIndex = 450;
        map.getPane('at_shadow').style.zIndex = 500;
    } else {
        var coords = [parseFloat(localStorage.getItem(_PoGoSDRegion+"lastCenterLat")),parseFloat(localStorage.getItem(_PoGoSDRegion+"lastCenterLng"))];
        var map = L.map('main-map', {
                    preferCanvas: true,
                    maxZoom: 18,}).setView(coords, parseInt(localStorage.getItem(_PoGoSDRegion+"lastZoom")));
 
        map.createPane('sub_shadow');
        map.createPane('at_shadow');
        map.getPane('sub_shadow').style.zIndex = 450;
        map.getPane('at_shadow').style.zIndex = 500;
 
        localStorage.removeItem(_PoGoSDRegion+"lastZoom");
        localStorage.removeItem(_PoGoSDRegion+"lastCenterLat");
        localStorage.removeItem(_PoGoSDRegion+"lastCenterLng");
    }
}

if (_DisplayPokemonLayer === 'True') {
    map.addLayer(overlays.Pokemon_Gen1);
    map.addLayer(overlays.Pokemon_Gen2);
    map.addLayer(overlays.Pokemon_Gen3); }
if (_DisplayGymsLayer === 'True') {
    map.addLayer(overlays.Gyms); }
if (_DisplayRaidsLayer === 'True') {
    map.addLayer(overlays.Raids); }
if (_DisplayParksInS2CellsLayer === 'True') {
    map.addLayer(overlays.Parks_In_S2_Cells); }
if (_DisplayEXGymsLayer === 'True') {
    map.addLayer(overlays.EX_Gyms); }
if (_DisplayWeatherLayer === 'True') {
    map.addLayer(overlays.Weather); }
if (_DisplayScanAreaLayer === 'True') {
    map.addLayer(overlays.ScanArea); }
if (_DisplayFilteredPokemonLayer === 'True') {
    map.addLayer(overlays.FilteredPokemon); }
if (_DisplaySpawnpointsLayer === 'True') {
    map.addLayer(overlays.Spawns);
    map.addLayer(overlays.Workers); }

var control = L.control.layers(null, overlays).addTo(map); //Layer Controls menu

loadMapLayer();
map.whenReady(function () {
    $('.my-location').on('click', function () {
        var currentZoom = map.getZoom();
        map.locate({ enableHighAccurracy: true, setView: true, maxZoom: currentZoom });
        
        if(_LocationMarker && _LocationRadar) {
            map.removeLayer(_LocationMarker);
            map.removeLayer(_LocationRadar);
        }
        map.setZoom(currentZoom);
        map.on('locationfound', onLocationFound);
        $('.hide-marker').show(); //Show hide My Location marker
    });

    getWeather();
    getExGyms();
    getPokemon();
    getGyms();
    getRaids();
    overlays.Parks_In_S2_Cells.once('add', function(e) {
        getCells();
        getParks();
    })
    
    getScanAreaCoords();
    if (_DisplaySpawnpointsLayer === 'True') {
        getSpawnPoints();
        getWorkers();
    }
    setInterval(getPokemon, 30000);
    setInterval(getGyms, 60000)
    setInterval(getRaids, 60000);
    setInterval(getWeather, 300000);
    
    if (_DisplaySpawnpointsLayer === 'True') {
        setInterval(getSpawnPoints, 30000);
        setInterval(getWorkers, 30000);;
    }
});

map.on('overlayadd', onOverLayAdd);
function onOverLayAdd(e) {
    if (e.name == 'Gyms') {
        $('.gym_btn').css('visibility', 'visible');
    }
    savedGymsToDisplay();
  
    if (e.name == 'Pokemon_Gen1') {
        var hide_button = $("#pokemon_gen1_layer button[data-value='hide']");
        var display_button = $("#pokemon_gen1_layer button[data-value='display']");
      
        boostedPokemonDisplay();
        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("POKEMON_GEN1_LAYER",'display');
    }

    if (e.name == 'Pokemon_Gen2') {
        var hide_button = $("#pokemon_gen2_layer button[data-value='hide']");
        var display_button = $("#pokemon_gen2_layer button[data-value='display']");
      
        boostedPokemonDisplay();
        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("POKEMON_GEN2_LAYER",'display');
    }

    if (e.name == 'Pokemon_Gen3') {
        var hide_button = $("#pokemon_gen3_layer button[data-value='hide']");
        var display_button = $("#pokemon_gen3_layer button[data-value='display']");
      
        boostedPokemonDisplay();
        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("POKEMON_GEN3_LAYER",'display');
    }

    if (e.name == 'Gyms') {
        var hide_button = $("#gyms_layer button[data-value='hide']");
        var display_button = $("#gyms_layer button[data-value='display']");
      
        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("GYMS_LAYER",'display');
    }

    if (e.name == 'Raids') {
        var hide_button = $("#raids_layer button[data-value='hide']");
        var display_button = $("#raids_layer button[data-value='display']");
      
        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("RAIDS_LAYER",'display');
    }

    if (e.name == 'Parks_In_S2_Cells') {
        var hide_button = $("#parks_in_s2_cells_layer button[data-value='hide']");
        var display_button = $("#parks_in_s2_cells_layer button[data-value='display']");

        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("PARKS_IN_S2_CELLS_LAYER",'display');
    }

    if (e.name == 'EX_Gyms') {
        var hide_button = $("#ex_eligible_layer button[data-value='hide']");
        var display_button = $("#ex_eligible_layer button[data-value='display']");

        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("EX_ELIGIBLE_LAYER",'display');
        getExGyms();
        getExRaids();
    }

    if (e.name == 'Weather') {
        var hide_button = $("#weather_layer button[data-value='hide']");
        var display_button = $("#weather_layer button[data-value='display']");
      
        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("WEATHER_LAYER",'display');
    }

    if (e.name == 'ScanArea') {
        var hide_button = $("#scan_area_layer button[data-value='hide']");
        var display_button = $("#scan_area_layer button[data-value='display']");
      
        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("SCAN_AREA_LAYER",'display');
    }

    if (e.name == 'FilteredPokemon') {
        var hide_button = $("#filtered_pokemon_layer button[data-value='hide']");
        var display_button = $("#filtered_pokemon_layer button[data-value='display']");
      
        hide_button.removeClass("active")
        display_button.addClass("active");
        setPreference("FILTERED_POKEMON_LAYER",'display');
    }
}

map.on('overlayremove', onOverLayRemove);
function onOverLayRemove(e) {
    var gymDisplayPreference = getPreference('gym_filter_buttons');
    if ((e.name == 'Gyms') && (gymDisplayPreference != 'display_gym_filters')) {
        $('.gym_btn').css('visibility', 'hidden');
    }
  
    if (e.name == 'Pokemon_Gen1') {
        var hide_button = $("#pokemon_gen1_layer button[data-value='hide']");
        var display_button = $("#pokemon_gen1_layer button[data-value='display']");
      
        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("POKEMON_GEN1_LAYER",'hide');
    }

    if (e.name == 'Pokemon_Gen2') {
        var hide_button = $("#pokemon_gen2_layer button[data-value='hide']");
        var display_button = $("#pokemon_gen2_layer button[data-value='display']");
      
        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("POKEMON_GEN2_LAYER",'hide');
    }
  
    if (e.name == 'Pokemon_Gen3') {
        var hide_button = $("#pokemon_gen3_layer button[data-value='hide']");
        var display_button = $("#pokemon_gen3_layer button[data-value='display']");
      
        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("POKEMON_GEN3_LAYER",'hide');
    }

    if (e.name == 'Gyms') {
        var hide_button = $("#gyms_layer button[data-value='hide']");
        var display_button = $("#gyms_layer button[data-value='display']");
      
        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("GYMS_LAYER",'hide');
    }
  
    if (e.name == 'Raids') {
        var hide_button = $("#raids_layer button[data-value='hide']");
        var display_button = $("#raids_layer button[data-value='display']");
      
        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("RAIDS_LAYER",'hide');
    }

    if (e.name == 'Parks_In_S2_Cells') {
        var hide_button = $("#parks_in_s2_cells_layer button[data-value='hide']");
        var display_button = $("#parks_in_s2_cells_layer button[data-value='display']");

        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("PARKS_IN_S2_CELLS_LAYER",'hide');
    }

    if (e.name == 'EX_Gyms') {
        var hide_button = $("#ex_eligible_layer button[data-value='hide']");
        var display_button = $("#ex_eligible_layer button[data-value='display']");

        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("EX_ELIGIBLE_LAYER",'hide');
    }
  
    if (e.name == 'Weather') {
        var hide_button = $("#weather_layer button[data-value='hide']");
        var display_button = $("#weather_layer button[data-value='display']");
      
        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("WEATHER_LAYER",'hide');
    }
  
    if (e.name == 'ScanArea') {
        var hide_button = $("#scan_area_layer button[data-value='hide']");
        var display_button = $("#scan_area_layer button[data-value='display']");
      
        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("SCAN_AREA_LAYER",'hide');
    }

    if (e.name == 'FilteredPokemon') {
        var hide_button = $("#filtered_pokemon_layer button[data-value='hide']");
        var display_button = $("#filtered_pokemon_layer button[data-value='display']");
      
        hide_button.addClass("active")
        display_button.removeClass("active");
        setPreference("FILTERED_POKEMON_LAYER",'hide');
    }

}

if ((getPreference("SHOW_SPLASH") === '0') && (_ForceSplashMessage != 'True')) {
    $('.splash_container').css('visibility', 'hidden');
}

$("#settings>ul.nav>li>a").on('click', function(e){
    // Click handler for each tab button.
    $(this).parent().parent().children("li").removeClass('active');
    $(this).parent().addClass('active');
    var panel = $(this).data('panel');
    var item = $("#settings>.settings-panel").removeClass('active')
        .filter("[data-panel='"+panel+"']").addClass('active');
    e.preventDefault(); //Prevent trailing # and causing refresh issue
});

$("#settings_close_btn").on('click', function(){
    // 'X' button on Settings panel
    $("#settings").animate({
        opacity: 0
    }, 250, function(){ $(this).hide(); });
});

$("#splash_popup_close_btn").on('click', function(){
    $("#splash_popup").animate({
        opacity: 0
    }, 250, function(){ $(this).hide(); });
    setPreference("SHOW_SPLASH", 0);
});


$("#splash_donate_close_btn").on('click', function(){
    $("#splash_popup").animate({
        opacity: 0
    }, 250, function(){ $(this).hide(); });
    setPreference("SHOW_SPLASH", 0);
});


$('.hide-marker').on('click', function(){
    // Button action to hide My Location marker
    map.removeLayer(_LocationMarker);
    $(this).hide();
    localStorage.removeItem(_PoGoSDRegion+"lastZoom");
    localStorage.removeItem(_PoGoSDRegion+"lastCenterLat");
    localStorage.removeItem(_PoGoSDRegion+"lastCenterLng");
});

$('.my-settings').on('click', function () {
    // Settings button on bottom-left corner
    $("#settings").show().animate({
        opacity: 1
    }, 250);
});

$('.instinct-gym-filter').on('click', function () {
    var item = $(this);
    var key = item.parent().data('group');
    var value = item.data('value');
    
    if ($(this).hasClass('active')) {
       $(this).removeClass('active');
       $('.instinct-gym-filter').css('opacity', '0.4');
       setPreference("instinct_gym_filter", "not-active");
    } else {
       $(this).addClass('active');
       $('.instinct-gym-filter').css('opacity', '1.0');
       setPreference("instinct_gym_filter", "active");
    }
            
    if (key.indexOf('gym_selection') > -1){
        // This is a gym's filter button
        savedGymsToDisplay();
    }else{
        setPreference(key, value);
    }
    
    if (!map.hasLayer(overlays.Gyms)) {
        map.addLayer(overlays.Gyms);
    }
    
});

$('.valor-gym-filter').on('click', function () {
    var item = $(this);
    var key = item.parent().data('group');
    var value = item.data('value');
    
    if ($(this).hasClass('active')) {
       $(this).removeClass('active');
       $('.valor-gym-filter').css('opacity', '0.4');
       setPreference("valor_gym_filter", "not-active");
    } else {
       $(this).addClass('active');
       $('.valor-gym-filter').css('opacity', '1.0');
       setPreference("valor_gym_filter", "active");
    }

    if (key.indexOf('gym_selection') > -1){
        // This is a gym's filter button
        savedGymsToDisplay();
    }else{
        setPreference(key, value);
    }
    
    if (!map.hasLayer(overlays.Gyms)) {
        map.addLayer(overlays.Gyms);
    }
    
});

$('.mystic-gym-filter').on('click', function () {
    var item = $(this);
    var key = item.parent().data('group');
    var value = item.data('value');

    if ($(this).hasClass('active')) {
       $(this).removeClass('active');
       $('.mystic-gym-filter').css('opacity', '0.4');
       setPreference("mystic_gym_filter", "not-active");
    } else {
       $(this).addClass('active');
       $('.mystic-gym-filter').css('opacity', '1.0');
       setPreference("mystic_gym_filter", "active");
    }
            
    if (key.indexOf('gym_selection') > -1){
        // This is a gym's filter button
        savedGymsToDisplay();
    }else{
        setPreference(key, value);
    }
    
    if (!map.hasLayer(overlays.Gyms)) {
        map.addLayer(overlays.Gyms);
    }
   
});

$('.empty-gym-filter').on('click', function () {
    var item = $(this);
    var key = item.parent().data('group');
    var value = item.data('value');

    if ($(this).hasClass('active')) {
       $(this).removeClass('active');
       $('.empty-gym-filter').css('opacity', '0.4');
       setPreference("empty_gym_filter", "not-active");
    } else {
       $(this).addClass('active');
       $('.empty-gym-filter').css('opacity', '1.0');
       setPreference("empty_gym_filter", "active");
    }
            
    if (key.indexOf('gym_selection') > -1){
        // This is a gym's filter button
        gymToDisplay(value);
    }else{
        setPreference(key, value);
    }
    
    if (!map.hasLayer(overlays.Gyms)) {
        map.addLayer(overlays.Gyms);
    }
    
});

$('.open-spot-gym-filter').on('click', function () {
    var item = $(this);
    var key = item.parent().data('group');
    var value = item.data('value');
    if ($(this).hasClass('active')) {
       $(this).removeClass('active');
       $('.open-spot-gym-filter').css('opacity', '0.40');
       $('.open-spot-gym-filter').css('background-image', 'url(' + "static/img/no-spots.png" + ')');
       setPreference("open_spot_gym_filter", "not-active");
    } else {
       $(this).addClass('active');
       $('.open-spot-gym-filter').css('opacity', '1.0');
       $('.open-spot-gym-filter').css('background-image', 'url(' + "static/img/all-gyms.png" + ')');
       setPreference("open_spot_gym_filter", "active");
    }
    
    if (key.indexOf('gym_selection') > -1){
        // This is a gym's filter button
        gymToDisplay(value);
    }else{
        setPreference(key, value);
    }
    
    if (!map.hasLayer(overlays.Gyms)) {
        map.addLayer(overlays.Gyms);
    }
    
});

$('.all-gyms-filter').on('click', function () {
    var item = $(this);
    var key = item.parent().data('group');
    var value = item.data('value');

    // Set all button classes to active
    $('.instinct-gym-filter').addClass('active');
    $('.valor-gym-filter').addClass('active');
    $('.mystic-gym-filter').addClass('active');
    $('.empty-gym-filter').addClass('active');
    $('.open-spot-gym-filter').addClass('active');
    
    // Set all buttons to display as unselected
    $('.instinct-gym-filter').css('opacity', '1.0');
    $('.valor-gym-filter').css('opacity', '1.0');
    $('.mystic-gym-filter').css('opacity', '1.0');
    $('.empty-gym-filter').css('opacity', '1.0');
    $('.open-spot-gym-filter').css('opacity', '1.0');
    $('.open-spot-gym-filter').css('background-image', 'url(' + "static/img/all-gyms.png" + ')');
    
    // Set all local preferences to active
    setPreference("mystic_gym_filter", "active");
    setPreference("valor_gym_filter", "active");
    setPreference("instinct_gym_filter", "active");
    setPreference("empty_gym_filter", "active");
    setPreference("open_spot_gym_filter", "active");
    
    if (key.indexOf('gym_selection') > -1){
        // This is a gym's filter button
        gymToDisplay(value);
    }else{
        setPreference(key, value);
    }
    
    if (!map.hasLayer(overlays.Gyms)) {
        map.addLayer(overlays.Gyms);
    }
    
});

$('#reset_btn').on('click', function () {
    // Reset button in Settings>More
    if (confirm("This will reset all your preferences. Are you sure?")){
        localStorage.clear();
        location.reload();
    }
});

$('body').on('click', '.popup_filter_link', function () {
    var id = $(this).data("pokeid");
    var layer = $(this).data("newlayer").toLowerCase();
    var item = $("#settings button[data-id='"+id+"']");
    moveToLayer(id, layer);
    item.removeClass("active").filter("[data-value='"+layer+"']").addClass("active");
});

$('body').on('click', '.ex_raid_popup_show_raids', function () {
    var action = $(this).data("action");
    setRaidsLayerDisplay(action);
});

$('#settings').on('click', '.settings-panel button', function () {
    //Handler for each button in every settings-panel.
    var item = $(this);
    if (item.hasClass('active')){
        return;
    }
    var id = item.data('id');
    var r_id = item.data('raid_id');
    var key = item.parent().data('group');
    var value = item.data('value');
    item.parent().children("button").removeClass("active");
    item.addClass("active");

    if (key === "display_all_none") {
        for (var id = 1; id <= _pokemon_count; id++){
            moveToLayer(id, value);
        }
        
        $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
        });
        item.removeClass("active");
    }
    
    if (key === "hide_gen_1") {
        for (var id = 1; id <= _pokemon_count_gen_1; id++){
            moveToLayer(id, value);
        }
        
        $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
        });
        item.removeClass("active");
    }

    if (key === "hide_gen_2") {
        for (var id = _pokemon_count_gen_1 + 1; id <= _pokemon_count_gen_2; id++){
            moveToLayer(id, value);
        }

        $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
        });
        item.removeClass("active");
    }

    if (key === "hide_gen_3") {
        for (var id = _pokemon_count_gen_2 + 1; id <= _pokemon_count_gen_3; id++){
            moveToLayer(id, value);
        }

        $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
        });
        item.removeClass("active");
    }

    // Stealing my code again?
    if (key === "MAP_CHOICE"){
        setPreference("MAP_CHOICE", value);
        if(getPreference("MAP_CHOICE") === "1"){
            map.removeLayer(_light);
            map.addLayer(_dark);
        }else{
            map.removeLayer(_dark);
            map.addLayer(_light);
        }
    }

    if (key.indexOf('filter-') > -1){
        // This is a pokemon's filter button
        moveToLayer(id, value);
    }else{
        setPreference(key, value);
    }
    
    if (key.indexOf('raid_filter-') > -1){
        // This is a raid's level filter button
        moveRaidToLayer(r_id, id, value);
    }else{
        setPreference(key, value);
    }
    
    if (key.indexOf('sponsored_filter') > -1){
        // This is a raid's sponsor filter button
        moveSponsoredToLayer(value);
    }else{
        setPreference(key, value);
    }

    if (key.indexOf('gym_filter_buttons') > -1){
        // This is the gym filter buttons switch
        setGymButtonsDisplay(value);
    }else{
        setPreference(key, value);
    }

    if (key.indexOf('show_sponsored_gym_logo') > -1){
        // This is the sponsored gym logo buttons switch
        setSponsoredLogoDisplay(value);
    }else{
        setPreference(key, value);
    }

    if (key.indexOf('gen1_buttons') > -1){
        setGen1Buttons(value);
    }else{
        setPreference(key, value);
    }
    
    if (key.indexOf('gen2_buttons') > -1){
        setGen2Buttons(value);
    }else{
        setPreference(key, value);
    }

    if (key.indexOf('gen3_buttons') > -1){
        setGen3Buttons(value);
    }else{
        setPreference(key, value);
    }

    if (key.indexOf('icon_theme_buttons') > -1){
        setIconTheme(value);
    }else{
        setPreference(key, value);
    }
    
    if (key.indexOf('show_boosted_pokemon') > -1){
        setBoostedPokemonDisplay(value);
    }else{
        setPreference(key,value);
    }
    
    if (key.indexOf('show_pokemon_type') > -1){
        setTypeIconDisplay(value);
    }else{
        setPreference(key,value);
    }
    
    if (key.indexOf('gym_landmark') > -1){
        setLandmarkDisplay(value);
    } else {
        setPreference(key, value);
    }

    if (key.indexOf('POKEMON_GEN1_LAYER') > -1){
        setPokemonGen1LayerDisplay(value);
    } else {
        setPreference(key, value);
    }
    
    if (key.indexOf('POKEMON_GEN2_LAYER') > -1){
        setPokemonGen2LayerDisplay(value);
    } else {
        setPreference(key, value);
    }

    if (key.indexOf('POKEMON_GEN3_LAYER') > -1){
        setPokemonGen3LayerDisplay(value);
    } else {
        setPreference(key, value);
    }
    
    if (key.indexOf('GYMS_LAYER') > -1){
        setGymLayerDisplay(value);
    } else {
        setPreference(key, value);
    }
    
    if (key.indexOf('RAIDS_LAYER') > -1){
        setRaidsLayerDisplay(value);
    } else {
        setPreference(key, value);
    }

    if (key.indexOf('PARKS_IN_S2_CELLS_LAYER') > -1){
        setParksInS2CellsLayerDisplay(value);
    } else {
        setPreference(key, value);
    }

    if (key.indexOf('EX_ELIGIBLE_LAYER') > -1){
        setExGymsLayerDisplay(value);
    } else {
        setPreference(key, value);
    }
    
    if (key.indexOf('WEATHER_LAYER') > -1){
        setWeatherLayerDisplay(value);
    } else {
        setPreference(key, value);
    }
    
    if (key.indexOf('SCAN_AREA_LAYER') > -1){
        setScanAreaLayerDisplay(value);
    } else {
        setPreference(key, value);
    }

    if (key.indexOf('FILTERED_POKEMON_LAYER') > -1){
        setFilteredPokemonLayerDisplay(value);
    } else {
        setPreference(key, value);
    }
});

function moveToLayer(id, layer){
    setPreference("filter-"+id, layer);
    layer = layer.toLowerCase();
    for(var k in markers) {
        var m = markers[k];
        if ((k.indexOf("pokemon-") > -1) && (m !== undefined) && (m.raw.pokemon_id === id)){
            m.removeFrom(overlays[m.overlay]);
            if (layer === 'pokemon'){
                boostedPokemonDisplay();
                if ( (m.raw.pokemon_id >= 1) && (m.raw.pokemon_id <= 151) ) {
                    m.overlay = 'Pokemon_Gen1';
                    m.addTo(overlays.Pokemon_Gen1);
                } else if ( (m.raw.pokemon_id >= 152) && (m.raw.pokemon_id <= 251)) {
                    m.overlay = 'Pokemon_Gen2';
                    m.addTo(overlays.Pokemon_Gen2);
                } else if ( (m.raw.pokemon_id >= 252) && (m.raw.pokemon_id <= 386)) {
                    m.overlay = 'Pokemon_Gen3';
                    m.addTo(overlays.Pokemon_Gen3);
                }
            }else if (layer === 'trash') {
                m.overlay = 'FilteredPokemon';
                m.addTo(overlays.FilteredPokemon);
            }
        }
    }
}

function moveRaidToLayer(r_id, poke_id, layer){
    var sponsorPreference = getPreference('sponsored_filter');
    setPreference("raid_filter-"+r_id, layer);
    layer = layer.toLowerCase();
    for(var k in markers) {
        var m = markers[k];
        if (sponsorPreference === 'sponsored_only') {
            if ((m !== undefined) && (m.raw.raid_level === r_id)){
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                if (m.sponsor === 'sponsored') {
                    if (layer === 'display_raid') {
                        m.overlay = "Raids";
                        m.addTo(overlays.Raids);
                    }else if (layer === 'hide_raid') {
                        m.overlay = "FilteredRaids";
                        m.addTo(hidden_overlays.FilteredRaids);
                    }
                } else {
                    if (layer === 'display_raid') {
                        m.overlay = "Raids";
                    }else if (layer === 'hide_raid') {
                        m.overlay = "FilteredRaids";
                    }
                }
            }
        } else {
            if ((m !== undefined) && (m.raw.raid_level === r_id)){
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                if (layer === 'display_raid'){
                    m.overlay = "Raids";
                    m.addTo(overlays.Raids);
                }else if (layer === 'hide_raid') {
                    m.overlay = "FilteredRaids";
                    m.addTo(hidden_overlays.FilteredRaids);
                }
            }
        }
    }
}

function moveSponsoredToLayer(layer){
    setPreference("sponsored_filter", layer);
    layer = layer.toLowerCase();
    for(var k in markers) {
        var m = markers[k];
        if (m !== undefined){
            if (layer === 'sponsored_only') {
                if ((m.sponsor === 'sponsored') && (m.overlay === 'Raids')){
                    m.removeFrom(hidden_overlays.FilteredRaids);
                    m.addTo(overlays.Raids);
                } else {
                    m.removeFrom(overlays.Raids);
                    m.addTo(hidden_overlays.FilteredRaids);
                }
            } else {
                if ((m.sponsor === 'sponsored') || (m.sponsor === 'non-sponsored')) {
                    if (m.overlay === 'Raids') {
                        m.removeFrom(hidden_overlays.FilteredRaids);
                        m.addTo(overlays.Raids);
                    } else {
                        m.removeFrom(overlays.Raids);
                        m.addTo(hidden_overlays.FilteredRaids);
                    }
                }
            }
        }
    }
}

function gymToDisplay(team_selection) {
    var display_mystic = $('.mystic-gym-filter').hasClass('active');
    var display_valor = $('.valor-gym-filter').hasClass('active');
    var display_instinct = $('.instinct-gym-filter').hasClass('active');
    var display_empty = $('.empty-gym-filter').hasClass('active');
    var display_open_spots = $('.open-spot-gym-filter').hasClass('active');
  
    for(var k in markers) {
        var m = markers[k];
        if (m !== undefined && m.raw.id.includes("fort-")) {
            if ((m.raw.team === 1) && (display_mystic)) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            } else if ((m.raw.team === 2) && (display_valor)) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            } else if ((m.raw.team === 3) && (display_instinct)) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            } else if ((m.raw.team === 0) && (display_empty)) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            } else {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "FilteredGyms";
                m.addTo(hidden_overlays.FilteredGyms);
            }
          
            // Show all gyms
            if (team_selection == 4) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            }
          
            // Filter for gyms without open spots
            if (!display_open_spots) {
                if (m.raw.slots_available == 0) {
                    m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                    m.overlay = "FilteredGyms";
                    m.addTo(hidden_overlays.FilteredGyms);
                }
            }
        }
    }
}

function savedGymsToDisplay() {
    if (getPreference('mystic_gym_filter') === "active") {
        $('.mystic-gym-filter').css('opacity', '1.0');
        $('.mystic-gym-filter').addClass('active');
        display_mystic = true;
    } else {
        $('.mystic-gym-filter').css('opacity', '0.4');
        $('.mystic-gym-filter').removeClass('active');
        display_mystic = false;
    }
    if (getPreference('valor_gym_filter') === "active") {
        $('.valor-gym-filter').css('opacity', '1.0');
        $('.valor-gym-filter').addClass('active');
        display_valor = true;
    } else {
        $('.valor-gym-filter').css('opacity', '0.4');
        $('.valor-gym-filter').removeClass('active');
        display_valor = false;
    }
    if (getPreference('instinct_gym_filter') === "active") {
        $('.instinct-gym-filter').css('opacity', '1.0');
        $('.instinct-gym-filter').addClass('active');
        display_instinct = true;
    } else {
        $('.instinct-gym-filter').css('opacity', '0.4');
        $('.instinct-gym-filter').removeClass('active');
        display_instinct = false;
    }
    if (getPreference('empty_gym_filter') === "active") {
        $('.empty-gym-filter').css('opacity', '1.0');
        $('.empty-gym-filter').addClass('active');
        display_empty = true;
    } else {
        $('.empty-gym-filter').css('opacity', '0.4');
        $('.empty-gym-filter').removeClass('active');
        display_empty = false;
    }
    if (getPreference('open_spot_gym_filter') === "active") {
        $('.open-spot-gym-filter').css('opacity', '1.0');
        $('.open-spot-gym-filter').addClass('active');
        $('.open-spot-gym-filter').css('background-image', 'url(' + "static/img/all-gyms.png" + ')');
        display_open_spots = true;
    } else {
        $('.open-spot-gym-filter').css('opacity', '0.4');
        $('.open-spot-gym-filter').removeClass('active');
        $('.open-spot-gym-filter').css('background-image', 'url(' + "static/img/no-spots.png" + ')');
        display_open_spots = false;
    }

    for(var k in markers) {
        var m = markers[k];
        if (m !== undefined && m.raw.id.includes("fort-")) {
            if ((m.raw.team === 1) && (display_mystic)) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            } else if ((m.raw.team === 2) && (display_valor)) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            } else if ((m.raw.team === 3) && (display_instinct)) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            } else if ((m.raw.team === 0) && (display_empty)) {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "Gyms";
                m.addTo(overlays.Gyms);
            } else {
                m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                m.overlay = "FilteredGyms";
                m.addTo(hidden_overlays.FilteredGyms);
            }
          
            if (!display_open_spots) {
                if (m.raw.slots_available == 0) {
                    m.removeFrom(overlays[m.overlay]); // Remove this marker from current overlay
                    m.overlay = "FilteredGyms";
                    m.addTo(hidden_overlays.FilteredGyms);
                }
            }
          
        }
    }
}

function sponsoredGymLogoDisplay(){
    if (getPreference("show_sponsored_gym_logo") === "hide_sponsored_gym_logo") {
        $('.sponsor_icon_marker').css('visibility', 'hidden');
    } else {
        $('.sponsor_icon_marker').css('visibility', 'visible');
    }
}

function boostedPokemonDisplay() {
    if (getPreference("show_boosted_pokemon") === "hide") {
        $('.boosted_type').css('visibility','hidden');
    } else {
        $('.boosted_type').css('visibility','visible');
    }
}

function typeIconDisplay() {
    if (getPreference("show_pokemon_type") === "display") {
        $('.type_icons').css('visibility','visible');
    } else {
        $('.type_icons').css('visibility','hidden');
    }
}

function setBoostedPokemonDisplay(value) {
    setPreference("show_boosted_pokemon", value);
    if (value == "display") {
        $(".boosted_type").each(function() {
            $(this).css('visibility', 'visible');
        });
    } else {
        $(".boosted_type").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }
}

function setTypeIconDisplay(value) {
    setPreference("show_pokemon_type", value);
    if (value == "display") {
        $(".type_icons").each(function() {
            $(this).css('visibility', 'visible');
        });
    } else {
        $(".type_icons").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }
}

function setLandmarkDisplay(value) {
    setPreference("gym_landmark", value);
}

function setPokemonGen1LayerDisplay(value) {
    setPreference("POKEMON_GEN1_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.Pokemon_Gen1);
    } else {
        map.removeLayer(overlays.Pokemon_Gen1);
    }
}

function setPokemonGen2LayerDisplay(value) {
    setPreference("POKEMON_GEN2_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.Pokemon_Gen2);
    } else {
        map.removeLayer(overlays.Pokemon_Gen2);
    }
}

function setPokemonGen3LayerDisplay(value) {
    setPreference("POKEMON_GEN3_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.Pokemon_Gen3);
    } else {
        map.removeLayer(overlays.Pokemon_Gen3);
    }
}

function setGymLayerDisplay(value) {
    setPreference("GYMS_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.Gyms);
    } else {
        map.removeLayer(overlays.Gyms);
    }
}

function setRaidsLayerDisplay(value) {
    setPreference("RAIDS_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.Raids);
    } else {
        map.removeLayer(overlays.Raids);
    }
}

function setParksInS2CellsLayerDisplay(value) {
    setPreference("PARKS_IN_S2_CELLS_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.Parks_In_S2_Cells);
    } else {
        map.removeLayer(overlays.Parks_In_S2_Cells);
    }
}

function setExGymsLayerDisplay(value) {
    setPreference("EX_ELIGIBLE_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.EX_Gyms);
    } else {
        map.removeLayer(overlays.EX_Gyms);
    }
}

function setWeatherLayerDisplay(value) {
    setPreference("WEATHER_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.Weather);
    } else {
        map.removeLayer(overlays.Weather);
    }
}

function setScanAreaLayerDisplay(value) {
    setPreference("SCAN_AREA_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.ScanArea);
    } else {
        map.removeLayer(overlays.ScanArea);
    }
}

function setFilteredPokemonLayerDisplay(value) {
    setPreference("FILTERED_POKEMON_LAYER", value)
    if ( value === "display" ) {
        map.addLayer(overlays.FilteredPokemon);
    } else {
        map.removeLayer(overlays.FilteredPokemon);
    }
}

function setGymButtonsDisplay(value){
    setPreference("gym_filter_buttons", value);
    if (value == "display_gym_filters") {
        $(".gym_btn").each(function() {
            $(this).css('visibility', 'visible');
        });
    } else {
        $(".gym_btn").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }
}

function setSponsoredLogoDisplay(value){
    setPreference("show_sponsored_gym_logo", value);
    if (value == "display_sponsored_gym_logo") {
        $(".sponsor_icon_marker").each(function() {
            $(this).css('visibility','visible');
        });
    } else {
        $(".sponsor_icon_marker").each(function() {
            $(this).css('visibility','hidden');
        });
    }
    
}

function setGen1Buttons(value){
    setPreference("gen1_buttons", value);
    if (value == "display_gen1") {
        $('.gen_1').css('display', '');
    } else if (value === "collapse_gen1") {
        $('.gen_1').css('display', 'none');
    }
}

function setGen2Buttons(value){
    setPreference("gen2_buttons", value);
    if (value == "display_gen2") {
        $('.gen_2').css('display', '');
    } else if (value === "collapse_gen2") {
        $('.gen_2').css('display', 'none');
    }
}

function setGen3Buttons(value){
    setPreference("gen3_buttons", value);
    if (value == "display_gen3") {
        $('.gen_3').css('display', '');
    } else if (value === "collapse_gen3") {
        $('.gen_3').css('display', 'none');
    }
}

function setIconTheme(value){
    setPreference("icon_theme_buttons", value);
    location.reload();
}


function populateSettingsPanels(){
    _defaultSettings['icon_theme_buttons'] = "og";
    var container = $('.settings-panel[data-panel="filters"]').children('.panel-body');
    var newHtml =
            '<h5>Raid Level Filters</h5><br>';
  
    for (var i = 1; i <= 5; i++){
        var partHtml =
            '<div class="text-center">' +
                '<div class="raid_filter_label"><b>Level ' + i + '  </b></div>' +
                '<div class="raid_filter_container">' +
                '<div id="raid_filter_button_group" class="btn-group" role="group" data-group="raid_filter-' + i + '">' +
                    '<button type="button" class="btn btn-default" data-raid_id="' + i + '" data-value="display_raid">Display</button>' +
                    '<button type="button" class="btn btn-default" data-raid_id="' + i + '" data-value="hide_raid">Hide</button>' +
                '</div>' +
            '</div>';

        newHtml += partHtml
    }

    newHtml +=
            '<hr />'+
            '<h5>Sponsored Raid Filter</h5><br>' +
            '<div id="sponsored_raid_filter_button_group" class="btn-group" role="group" data-group="sponsored_filter">' +
                '<button type="button" class="btn btn-default" data-value="sponsored_only">Sponsored Only</button>' +
                '<button type="button" class="btn btn-default" data-value="all_raids">All Raids</button>' +
            '</div>';

    newHtml +=
            '<hr />'+
            '<h5>Pokemon Filters</h5><br>' +
            '<div data-group="display_all_none">' +
                '<button type="button" class="btn btn-default" data-value="trash">Hide All</button>' +
            '</div><br><h6>*Browser will pause briefly to hide all.</h6><br><br>';

    // Generation divider
    newHtml +=
            '<div class="gen_label"><b>Generation 1  </b></div>' +
            '<div class="btn-group" role="group" data-group="gen1_buttons">' +
                '<button type="button" class="btn btn-default" data-value="display_gen1">Display Filters</button>' +
                '<button type="button" class="btn btn-default" data-value="collapse_gen1">Collapse</button>' +
            '</div>';


    // Open Gen 1 Div Container
    newHtml +=
            '<div class="gen_1" data-group="gen_1_group">';

    newHtml +=
            '<hr />' +
            '<div data-group="hide_gen_1">' +
                '<button type="button" class="btn btn-default" data-value="pokemon">Show Generation 1</button>   ' +
                '<button type="button" class="btn btn-default" data-value="trash">Hide Generation 1</button>' +
            '</div><br>';
  
    for (var i = 1; i <= _pokemon_count_gen_1; i++){
        var partHtml =
            '<div class="filter_buttons_group">' +
                '<div class="filter_container">' +
                    '<div class="filter_sprite_container">' +
                        '<div id="menu" class="sprite-' + getPreference("icon_theme_buttons") + '"><span class="sprite-' + getPreference("icon_theme_buttons") + '-'+i+'"></span></div>' +
                    '</div>' +
                    '<div class="filter_button_container">' +
                        '<div class="btn-group" role="group" data-group="filter-' + i + '">' +
                            '<button type="button" class="btn btn-default" data-id="' + i + '" data-value="pokemon">Display</button>' +
                            '<button type="button" class="btn btn-default" data-id="' + i + '" data-value="trash">Hide</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="pokemon_name_container">' + pokemon_name_type[i][1] + '</div>' +
                '</div>' +
            '</div>';

        newHtml += partHtml
    }
  
    newHtml +=
            '</div>';
    // Close Gen 1 Div Container

    // Generation divider
    newHtml +=
            '<hr />' +
            '<div class="gen_label"><b>Generation 2  </b></div>' +
            '<div class="btn-group" role="group" data-group="gen2_buttons">' +
                '<button type="button" class="btn btn-default" data-value="display_gen2">Display Filters</button>' +
                '<button type="button" class="btn btn-default" data-value="collapse_gen2">Collapse</button>' +
            '</div>';

    // Open Gen 2 Div Container
    newHtml +=
            '<div class="gen_2" data-group="gen_2_group">';

    newHtml +=
            '<hr />' +
            '<div data-group="hide_gen_2">' +
                '<button type="button" class="btn btn-default" data-value="pokemon">Show Generation 2</button>   ' +
                '<button type="button" class="btn btn-default" data-value="trash">Hide Generation 2</button>' +
            '</div><br>';

    for (var i = _pokemon_count_gen_1 + 1; i <= _pokemon_count_gen_2; i++){
        var partHtml =
            '<div class="filter_buttons_group">' +
                '<div class="filter_container">' +
                    '<div class="filter_sprite_container">' +
                        '<div id="menu" class="sprite-' + getPreference("icon_theme_buttons") + '"><span class="sprite-' + getPreference("icon_theme_buttons") + '-'+i+'"></span></div>' +
                    '</div>' +
                    '<div class="filter_button_container">' +
                        '<div class="btn-group" role="group" data-group="filter-' + i + '">' +
                            '<button type="button" class="btn btn-default" data-id="' + i + '" data-value="pokemon">Display</button>' +
                            '<button type="button" class="btn btn-default" data-id="' + i + '" data-value="trash">Hide</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="pokemon_name_container">' + pokemon_name_type[i][1] + '</div>' +
                '</div>' +
            '</div>';

        newHtml += partHtml
    }
  
    newHtml +=
            '</div>';
    // Close Gen 2 Div Container

    // Generation divider
    newHtml +=
            '<hr />' +
            '<div class="gen_label"><b>Generation 3  </b></div>' +
            '<div class="btn-group" role="group" data-group="gen3_buttons">' +
                '<button type="button" class="btn btn-default" data-value="display_gen3">Display Filters</button>' +
                '<button type="button" class="btn btn-default" data-value="collapse_gen3">Collapse</button>' +
            '</div>';

    // Open Gen 3 Div Container
    newHtml +=
            '<div class="gen_3" data-group="gen_3_group">';

    newHtml +=
            '<hr />' +
            '<div data-group="hide_gen_3">' +
                '<button type="button" class="btn btn-default" data-value="pokemon">Show Generation 3</button>   ' +
                '<button type="button" class="btn btn-default" data-value="trash">Hide Generation 3</button>' +
            '</div><br>';

    for (var i = _pokemon_count_gen_2 + 1; i <= _pokemon_count_gen_3; i++){
        var partHtml =
            '<div class="filter_buttons_group">' +
                '<div class="filter_container">' +
                    '<div class="filter_sprite_container">' +
                        '<div id="menu" class="sprite-' + getPreference("icon_theme_buttons") + '"><span class="sprite-' + getPreference("icon_theme_buttons") + '-'+i+'"></span></div>' +
                    '</div>' +
                    '<div class="filter_button_container">' +
                        '<div class="btn-group" role="group" data-group="filter-' + i + '">' +
                            '<button type="button" class="btn btn-default" data-id="' + i + '" data-value="pokemon">Display</button>' +
                            '<button type="button" class="btn btn-default" data-id="' + i + '" data-value="trash">Hide</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="pokemon_name_container">' + pokemon_name_type[i][1] + '</div>' +
                '</div>' +
            '</div>';

        newHtml += partHtml
    }
  
    newHtml +=
            '</div>';
    // Close Gen 3 Div Container

    container.html(newHtml);
}

function setSettingsDefaults(){
    _defaultSettings['sponsored_filter'] = "all_raids";
    _defaultSettings['gym_selection'] = 4;
    _defaultSettings['gym_filter_buttons'] = "hide_gym_filters";
    _defaultSettings['mystic_gym_filter'] = "active";
    _defaultSettings['valor_gym_filter'] = "active";
    _defaultSettings['instinct_gym_filter'] = "active";
    _defaultSettings['empty_gym_filter'] = "active";
    _defaultSettings['open_spot_gym_filter'] = "active";
    _defaultSettings['gen1_buttons'] = "display_gen1";
    _defaultSettings['gen2_buttons'] = "display_gen2";
    _defaultSettings['gen3_buttons'] = "display_gen3";
    _defaultSettings['show_sponsored_gym_logo'] = "display_sponsored_gym_logo";
    _defaultSettings['show_boosted_pokemon'] = "hide";
    _defaultSettings['show_pokemon_type'] = "hide";
    _defaultSettings['gym_landmark'] = "display";
  
    if (_DisplayPokemonLayer === 'True') {
        _defaultSettings['POKEMON_GEN1_LAYER'] = "display";
        _defaultSettings['POKEMON_GEN2_LAYER'] = "display";
        _defaultSettings['POKEMON_GEN3_LAYER'] = "display";
    } else {
        _defaultSettings['POKEMON_GEN1_LAYER'] = "hide";
        _defaultSettings['POKEMON_GEN2_LAYER'] = "hide";
        _defaultSettings['POKEMON_GEN3_LAYER'] = "hide";
    }
    if (_DisplayGymsLayer === 'True') {
        _defaultSettings['GYMS_LAYER'] = "display";
    } else {
        _defaultSettings['GYMS_LAYER'] = "hide";
    }
    if (_DisplayRaidsLayer === 'True') {
        _defaultSettings['RAIDS_LAYER'] = "display";
    } else {
        _defaultSettings['RAIDS_LAYER'] = "hide";
    }
    if (_DisplayParksInS2CellsLayer === 'True') {
        _defaultSettings['PARKS_IN_S2_CELLS_LAYER'] = "display";
    } else {
        _defaultSettings['PARKS_IN_S2_CELLS_LAYER'] = "hide";
    }
    if (_DisplayEXGymsLayer === 'True') {
        _defaultSettings['EX_ELIGIBLE_LAYER'] = "display";
    } else {
        _defaultSettings['EX_ELIGIBLE_LAYER'] = "hide";
    }
    if (_DisplayWeatherLayer === 'True') {
        _defaultSettings['WEATHER_LAYER'] = "display";
    } else {
        _defaultSettings['WEATHER_LAYER'] = "hide";
    }
    if (_DisplayFilteredPokemonLayer === 'True') {
        _defaultSettings['FILTERED_POKEMON_LAYER'] = "display";
    } else {
        _defaultSettings['FILTERED_POKEMON_LAYER'] = "hide";
    }
    if (_DisplayScanAreaLayer === 'True') {
        _defaultSettings['SCAN_AREA_LAYER'] = "display";
    } else {
        _defaultSettings['SCAN_AREA_LAYER'] = "hide";
    }

    for (var i = 1; i <= _pokemon_count; i++){
        _defaultSettings['filter-'+i] = (_defaultSettings['TRASH_IDS'].indexOf(i) > -1) ? "trash" : "pokemon";
    };
    for (var i = 1; i <= 5; i++) {
        _defaultSettings['raid_filter-'+i] = (_defaultSettings['RAID_IDS'].indexOf(i) > -1) ? "hide_raid" : "display_raid";
    };

    $("#settings div.btn-group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);
        if (value === false)
            value = "0";
        else if (value === true)
            value = "1";
        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
    });

    $("#icon_theme_button_group").each(function(){
        var item = $(this);
        var key = item.data('group');
        var value = getPreference(key);

        item.children("button").removeClass("active").filter("[data-value='"+value+"']").addClass("active");
    });
}

populateSettingsPanels();
setSettingsDefaults();

if (getPreference("gym_filter_buttons") === "hide_gym_filters") {
    $('.gym_btn').css('visibility', 'hidden');
} else {
    savedGymsToDisplay();
}

if (getPreference("show_sponsored_gym_logo") === "hide_sponsored_gym_logo") {
    $('.sponsor_icon_marker').css('visibility', 'hidden');
} else {
    $('.sponsor_icon_marker').css('visibility', 'visible');
}

if (getPreference("show_boosted_pokemon") === "hide") {
    $('.boosted_type').css('visibility','hidden');
} else {
    $('.boosted_type').css('visibility','visible');
}

if ((getPreference("gen1_buttons") === "display_gen1")) {
    $('.gen_1').css('display', '');
} else {
    $('.gen_1').css('display', 'none');
}

if ((getPreference("gen2_buttons") === "display_gen2")) {
    $('.gen_2').css('display', '');
} else {
    $('.gen_2').css('display', 'none');
}

if ((getPreference("gen3_buttons") === "display_gen3")) {
    $('.gen_3').css('display', '');
} else {
    $('.gen_3').css('display', 'none');
}

if ( getPreference("POKEMON_GEN1_LAYER") === "display" ) {
    map.addLayer(overlays.Pokemon_Gen1);
} else {
    map.removeLayer(overlays.Pokemon_Gen1);
}

if ( getPreference("POKEMON_GEN2_LAYER") === "display" ) {
    map.addLayer(overlays.Pokemon_Gen2);
} else {
    map.removeLayer(overlays.Pokemon_Gen2);
}

if ( getPreference("POKEMON_GEN3_LAYER") === "display" ) {
    map.addLayer(overlays.Pokemon_Gen3);
} else {
    map.removeLayer(overlays.Pokemon_Gen3);
}

if ( getPreference("GYMS_LAYER") === "display" ) {
    map.addLayer(overlays.Gyms);
} else {
    map.removeLayer(overlays.Gyms);
}

if ( getPreference("RAIDS_LAYER") === "display" ) {
    map.addLayer(overlays.Raids);
} else {
    map.removeLayer(overlays.Raids);
}

if ( getPreference("PARKS_IN_S2_CELLS_LAYER") === "display" ) {
    map.addLayer(overlays.Parks_In_S2_Cells);
} else {
    map.removeLayer(overlays.Parks_In_S2_Cells);
}

if ( getPreference("EX_ELIGIBLE_LAYER") === "display" ) {
    map.addLayer(overlays.EX_Gyms);
} else {
    map.removeLayer(overlays.EX_Gyms);
}

if ( getPreference("WEATHER_LAYER") === "display" ) {
    map.addLayer(overlays.Weather);
} else {
    map.removeLayer(overlays.Weather);
}

if ( getPreference("SCAN_AREA_LAYER") === "display" ) {
    map.addLayer(overlays.ScanArea);
} else {
    map.removeLayer(overlays.ScanArea);
}

if ( getPreference("FILTERED_POKEMON_LAYER") === "display" ) {
    map.addLayer(overlays.FilteredPokemon);
} else {
    map.removeLayer(overlays.FilteredPokemon);
}

function getPreference(key, ret){
    return localStorage.getItem(key) ? localStorage.getItem(key) : (key in _defaultSettings ? _defaultSettings[key] : ret);
}

function setPreference(key, val){
    localStorage.setItem(key, val);
}

$(window).scroll(function () {
    if ($(this).scrollTop() > 100) {
        $('.scroll-up').fadeIn();
    } else {
        $('.scroll-up').fadeOut();
    }
});

$("#settings").scroll(function () {
    if ($(this).scrollTop() > 100) {
        $('.scroll-up').fadeIn();
    } else {
        $('.scroll-up').fadeOut();
    }
});

$('.scroll-up').click(function () {
    $("html, body, #settings").animate({
        scrollTop: 0
    }, 500);
    return false;
});

function calculateRemainingTime(expire_at_timestamp) {
    var diff = (expire_at_timestamp - new Date().getTime() / 1000);
    var minutes = parseInt(diff / 60);
    var seconds = parseInt(diff - (minutes * 60));
    return minutes + ':' + (seconds > 9 ? "" + seconds: "0" + seconds);
}

function calculateRemainingRaidTime(expire_at_timestamp1,expire_at_timestamp2) {
    var diff1 = (expire_at_timestamp1 - new Date().getTime() / 1000);
  
    if (diff1 < 0) {
        var diff2 = (expire_at_timestamp2 - new Date().getTime() / 1000);
        var minutes = parseInt(diff2 / 60);
        var seconds = parseInt(diff2 - (minutes * 60));
    return minutes + ':' + (seconds > 9 ? "" + seconds: "0" + seconds);
    } else {
        var minutes = parseInt(diff1 / 60);
        var seconds = parseInt(diff1 - (minutes * 60));
    }
    return minutes + ':' + (seconds > 9 ? "" + seconds: "0" + seconds);
}

function updateTime() {
    if (getPreference("SHOW_TIMER") === "1"){
        $(".remaining_text").each(function() {
            $(this).css('visibility', 'visible');
            this.innerHTML = calculateRemainingTime($(this).data('expire'));
        });
    }else{
        $(".remaining_text").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }
  
    if (getPreference("SHOW_RAID_TIMER") === "1"){
        $(".raid_remaining_text").each(function() {
            $(this).css('visibility', 'visible');
            this.innerHTML = calculateRemainingRaidTime($(this).data('expire1'),$(this).data('expire2'));
            
            var current_time = new Date().getTime() / 1000;
            if ($(this).data('expire1') > current_time) {
                $(this).css('background-color', 'rgba(255, 128, 0, 0.7)'); // Orange
            } else {
                $(this).css('background-color', 'rgba(51, 204, 51, 0.7)');  // Green
            }
        });
    }else{
        $(".pre_raid_remaining_text").each(function() {
            $(this).css('visibility', 'hidden');
        });
        $(".during_raid_remaining_text").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }

    // Straight up copying and pasting my code
    if (getPreference("SHOW_FORM") === "1"){
        $(".form_text").each(function() {
            $(this).css('visibility', 'visible');
        });
    }else{
        $(".form_text").each(function() {
            $(this).css('visibility', 'hidden');
        });
    }
}

function convertToTwelveHourTime(raw_time) {
    var processed_time = new Date(raw_time * 1000);
    if ((processed_time.getHours() < 13) && (processed_time.getHours() > 0) ) {
        var hours = processed_time.getHours();
    } else if (processed_time.getHours() < 1) {
        var hours = 12;
    } else {
        var hours = processed_time.getHours() - 12;
    }
    if (processed_time.getMinutes() < 10) {
        var minutes = "0" + processed_time.getMinutes();
    } else {
        var minutes = processed_time.getMinutes();
    }
    if ((processed_time.getHours() - 12) < 0) {
        var period = "am";
    } else {
        var period = "pm";
    }
    var twelveHourTime = hours + ":" + minutes + period;
    return twelveHourTime;
}

// Don't forget to steal this too
function loadMapLayer() {
    if (getPreference("MAP_CHOICE") === "1"){
        map.removeLayer(_light);
        map.addLayer(_dark);
    }else{
        map.removeLayer(_dark);
        map.addLayer(_light);
    }
}

function onLocationFound(e) {
    var currentZoom = map.getZoom();
    _LocationMarker = L.marker(e.latlng, {icon: ultraIconMedium}).bindPopup('Your Location').addTo(map);
    _LocationRadar = L.circle(e.latlng, {radius: 35, weight: 1, fillOpacity: 0.1}).addTo(map);

    //Set marker size when initial location found
    if (currentZoom == 18) {
        _LocationMarker.setIcon(ultraIconLarge);
    } else if (currentZoom == 17) {
        _LocationMarker.setIcon(ultraIconMedium);
    } else {
        _LocationMarker.setIcon(ultraIconSmall);
    }

    map.on('zoomend', function() {
            var currentZoom = map.getZoom();
 
            //Set marker size when zooming in and out
            if (currentZoom == 18) {
                _LocationMarker.setIcon(ultraIconLarge);
            } else if (currentZoom == 17) {
                _LocationMarker.setIcon(ultraIconMedium);
            } else {
                _LocationMarker.setIcon(ultraIconSmall);
            }
    });

    var currentCenter = map.getCenter();
    localStorage.setItem(_PoGoSDRegion+"lastZoom", currentZoom);
    localStorage.setItem(_PoGoSDRegion+"lastCenterLat", currentCenter.lat);
    localStorage.setItem(_PoGoSDRegion+"lastCenterLng", currentCenter.lng);
}

// Really? Copying this too?
function getSponsorGymType(raw) {
    var sponsor_type = '';
  
  
    if (raw.external_id.includes(".")) {
        sponsor_type = 'non-sponsored';
    } else {
        sponsor_type = 'sponsored';
    }
    return sponsor_type;
}

function getVertices(center_point) {
    lat_radius = 0;
    lon_radius = 0;
    center_lat = center_point[0];
    center_lon = center_point[1];
}

function getTypeIcons(pokemon_id) {
    var innerHTML = '<div class="type_icons"><img id="type" class="type-' + pokemon_name_type[pokemon_id][2] + '" src="static/img/blank_1x1.png">';

    if ( pokemon_name_type[pokemon_id][3] != "none") {
        innerHTML += '<img id="type" class="type-' + pokemon_name_type[pokemon_id][3] + '" src="static/img/blank_1x1.png">';
    }
    innerHTML += '</div>';
    return innerHTML;
}

function checkBoost(boost_status) {
    var innerHTML = '';
  
    if ( boost_status === "boosted" ) {
        innerHTML = '<div class="boosted_type"><img id="boost" class="boosted_icon" src="static/img/blank_1x1.png"></div>';
    }
    return innerHTML;
}

function getBoostStatus(pokemon) {
    var boost = 'normal';

    switch (weather[parseInt(pokemon.pokemon_s2_cell_id)].condition) {
        case 0:
            boost = 'normal';
            break;
        case 1:
            if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'grass' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'grass' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'fire' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'fire' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'ground' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'ground' ) ){
                boost = 'boosted';
            }
            break;
        case 2:
            if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'water' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'water' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'electric' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'electric' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'bug' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'bug' ) ) {
                boost = 'boosted';
            }
            break;
        case 3:
            if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'normal' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'normal' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'rock' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'rock' ) ) {
                boost = 'boosted';
            }
            break;
        case 4:
            if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'fairy' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'fairy' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'fighting' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'fighing' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'poison' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'poison' ) ) {
                boost = 'boosted';
            }
            break;
        case 5:
            if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'flying' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'flying' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'dragon' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'dragon' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'psychic' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'psychic' ) ) {
                boost = 'boosted';
            }
            break;
        case 6:
            if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'ice' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'ice' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'steel' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'steel' ) ) {
                boost = 'boosted';
            }
            break;
        case 7:
            if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'dark' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'dark' ) ) {
                boost = 'boosted';
            } else if ( ( pokemon_name_type[pokemon.pokemon_id][2] == 'ghost' ) || ( pokemon_name_type[pokemon.pokemon_id][3] == 'ghost' ) ) {
                boost = 'boosted';
            }
            break;
        default:
            boost = 'normal';
    }
    return boost;
}
