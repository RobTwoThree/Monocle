from datetime import datetime, timedelta, timezone
from collections import deque
from statistics import mean

from db import Session, get_pokemon_ranking
from names import POKEMON_NAMES

import time

import config

# set unset config options to None
for variable_name in ['PB_API_KEY', 'PB_CHANNEL', 'TWITTER_CONSUMER_KEY',
                      'TWITTER_CONSUMER_SECRET', 'TWITTER_ACCESS_KEY',
                      'TWITTER_ACCESS_SECRET', 'LANDMARKS', 'AREA_NAME',
                      'HASHTAGS', 'TZ_OFFSET', 'MAX_TIME', 'NOTIFY_RANKING',
                      'NOTIFY_IDS']:
    if not hasattr(config, variable_name):
        setattr(config, variable_name, None)

# set defaults for unset config options
if not hasattr(config, 'MIN_TIME'):
    setattr(config, 'MIN_TIME', 120)
if not hasattr(config, 'ALWAYS_NOTIFY'):
    setattr(config, 'ALWAYS_NOTIFY', 0)
if not hasattr(config, 'ALWAYS_NOTIFY'):
    setattr(config, 'DESIRED_FREQUENCY', (1200, 1800))


def generic_place_string():
    """ Create a place string with area name (if available)"""
    if config.AREA_NAME:
        # no landmarks defined, just use area name
        place = 'in ' + config.AREA_NAME
        return place
    else:
        # no landmarks or area name defined, just say 'around'
        return 'around'


class Notification:

    def __init__(self, name, coordinates, time_till_hidden):
        self.name = name
        self.coordinates = coordinates
        if config.TZ_OFFSET:
            now = datetime.now(timezone(timedelta(hours=config.TZ_OFFSET)))
        else:
            now = datetime.now()

        if config.HASHTAGS:
            self.hashtags = config.HASHTAGS.copy()
        else:
            self.hashtags = set()

        if time_till_hidden == 901:
            self.longspawn = True
        else:
            self.longspawn = False
        self.delta = timedelta(seconds=time_till_hidden)
        self.expire_time = (now + self.delta).strftime('%I:%M %p').lstrip('0')
        self.map_link = ('https://maps.google.com/maps?q=' +
                         str(round(self.coordinates[0], 5)) + ',' +
                         str(round(self.coordinates[1], 5)))
        self.place = None

    def notify(self):
        if config.LANDMARKS:
            landmark = config.LANDMARKS.find_landmark(self.coordinates)
        else:
            landmark = None

        if landmark:
            self.place = landmark.generate_string(self.coordinates)
            if landmark.hashtags:
                self.hashtags.update(landmark.hashtags)
        else:
            self.place = generic_place_string()

        tweeted = False
        pushed = False

        if config.PB_API_KEY:
            pushed = self.pbpush()

        if (config.TWITTER_CONSUMER_KEY and
                config.TWITTER_CONSUMER_SECRET and
                config.TWITTER_ACCESS_KEY and
                config.TWITTER_ACCESS_SECRET):
            tweeted = self.tweet()

        if tweeted and pushed:
            return (True, 'Tweeted and pushed about ' + self.name + '.')
        elif tweeted:
            return (True, 'Tweeted about ' + self.name + '.')
        elif pushed:
            return (True, 'Pushed about ' + self.name + '.')
        else:
            return (False, 'Failed to notify about ' + self.name + '.')

    def pbpush(self):
        """ Send a PushBullet notification either privately or to a channel,
        depending on whether or not PB_CHANNEL is set in config.
        """

        from pushbullet import Pushbullet
        pb = Pushbullet(config.PB_API_KEY)

        minutes, seconds = divmod(self.delta.total_seconds(), 60)
        time_remaining = str(int(minutes)) + 'm' + str(round(seconds)) + 's.'

        if config.AREA_NAME:
            if self.longspawn:
                title = ('A wild ' + self.name + ' will be in ' +
                         config.AREA_NAME + ' until at least ' +
                         self.expire_time + '!')
            else:
                title = ('A wild ' + self.name + ' will be in ' +
                         config.AREA_NAME + ' until ' + self.expire_time + '!')
        elif self.longspawn:
            title = ('A wild ' + self.name +
                     ' will expire within 45 minutes of ' +
                     self.expire_time + '!')
        else:
            title = ('A wild ' + self.name + ' will expire at ' +
                     self.expire_time + '!')

        if self.longspawn:
            body = 'It will be ' + self.place + ' for 15-60 minutes.'
        else:
            body = 'It will be ' + self.place + ' for ' + time_remaining

        try:
            channel = pb.channels[config.PB_CHANNEL]
            channel.push_link(title, self.map_link, body)
        except (IndexError, KeyError):
            pb.push_link(title, self.map_link, body)
        return True

    def tweet(self):
        """ Create message, reduce it until it fits in a tweet, and then tweet
        it with a link to Google maps and tweet location included.
        """
        import twitter

        def generate_tag_string(hashtags):
            '''create hashtag string'''
            tag_string = ''
            if hashtags:
                for hashtag in hashtags:
                    tag_string += '#' + hashtag + ' '
            return tag_string
        tag_string = generate_tag_string(self.hashtags)

        if self.longspawn:
            tweet_text = ('A wild ' + self.name + ' appeared ' +
                          self.place + '! It will expire within 45min of '
                          + self.expire_time + '. ' + tag_string)
        else:
            tweet_text = ('A wild ' + self.name + ' appeared! It will be ' +
                          self.place + ' until ' + self.expire_time + '. ' +
                          tag_string)

        while len(tweet_text) > 116:
            if self.hashtags:
                hashtag = self.hashtags.pop()
                tweet_text = tweet_text.replace(' #' + hashtag, '')
            else:
                break

        if (len(tweet_text) > 116) and self.longspawn:
            self.expire_time = "at least " + self.expire_time
            tweet_text = ('A wild ' + self.name + ' appeared! It will be ' +
                          self.place + ' until ' + self.expire_time + '. ')
        if (len(tweet_text) > 116) and config.AREA_NAME:
            tweet_text = ('A wild ' + self.name + ' will be in ' +
                          config.AREA_NAME + ' until ' +
                          self.expire_time + '. ')
        if len(tweet_text) > 116:
            tweet_text = ('A wild ' + self.name + ' will be around until '
                          + self.expire_time + '. ')

        try:
            api = twitter.Api(consumer_key=config.TWITTER_CONSUMER_KEY,
                              consumer_secret=config.TWITTER_CONSUMER_SECRET,
                              access_token_key=config.TWITTER_ACCESS_KEY,
                              access_token_secret=config.TWITTER_ACCESS_SECRET)
            api.PostUpdate(tweet_text + self.map_link,
                           latitude=self.coordinates[0],
                           longitude=self.coordinates[1],
                           display_coordinates=True)
        except twitter.error.TwitterError:
            return False
        else:
            return True


class Notifier:

    def __init__(self):
        self.recent_notifications = deque(maxlen=200)
        self.notify_ranking = config.NOTIFY_RANKING
        self.set_pokemon_ranking()
        self.set_required_times()
        self.differences = deque(maxlen=10)
        self.last_notification = None

    def increase_range(self):
        if self.notify_ranking < 75:
            self.notify_ranking += 2
            self.set_pokemon_ranking()
            self.set_required_times()

    def decrease_range(self):
        if self.notify_ranking > 20:
            self.notify_ranking -= 2
            self.set_pokemon_ranking()
            self.set_required_times()

    def set_pokemon_ranking(self):
        if self.notify_ranking:
            session = Session()
            self.pokemon_ranking = get_pokemon_ranking(session)
            session.close()
            setattr(config, 'NOTIFY_IDS', [])
            for pokemon_id in self.pokemon_ranking[0:self.notify_ranking]:
                config.NOTIFY_IDS.append(pokemon_id)
        elif config.NOTIFY_IDS:
            self.pokemon_ranking = config.NOTIFY_IDS
            setattr(config, 'NOTIFY_RANKING', len(config.NOTIFY_IDS))
        else:
            raise ValueError('Must configure NOTIFY_RANKING or NOTIFY_IDS.')

    def set_required_times(self):
        self.time_required = dict()

        for pokemon_id in self.pokemon_ranking[0:config.ALWAYS_NOTIFY]:
            self.time_required[pokemon_id] = 0
        required_time = config.MIN_TIME
        if config.MAX_TIME and (self.notify_ranking > config.ALWAYS_NOTIFY):
            increment = (config.MAX_TIME /
                         (self.notify_ranking - config.ALWAYS_NOTIFY))
            for pokemon_id in self.pokemon_ranking[
                    config.ALWAYS_NOTIFY:self.notify_ranking]:
                required_time += increment
                self.time_required[pokemon_id] = int(required_time)
        else:
            for pokemon_id in self.pokemon_ranking[
                    config.ALWAYS_NOTIFY:self.notify_ranking]:
                self.time_required[pokemon_id] = int(required_time)

    def notify(self, pokemon):
        """Send a PushBullet notification and/or a Tweet, depending on if their
        respective API keys have been set in config.
        """

        # skip if no API keys have been set in config
        if not (config.PB_API_KEY or config.TWITTER_CONSUMER_KEY):
            return (False, 'Did not notify, no Twitter/PushBullet keys set.')

        time_till_hidden = pokemon['time_till_hidden_ms'] / 1000
        if time_till_hidden < 0 or time_till_hidden > 3600:
            time_till_hidden = 901
        coordinates = (pokemon['latitude'], pokemon['longitude'])
        pokeid = pokemon['pokemon_data']['pokemon_id']
        encounter_id = pokemon['encounter_id']
        name = POKEMON_NAMES[pokeid]

        if encounter_id in self.recent_notifications:
            # skip duplicate
            return (False, 'Already notified about ' + name + '.')

        if time_till_hidden < self.time_required[pokeid]:
            return (False, name + ' was expiring too soon to notify. '
                    + str(time_till_hidden) + 's/'
                    + str(self.time_required[pokeid]) + 's')

        code, explanation = Notification(name, coordinates, time_till_hidden).notify()
        if code:
            self.recent_notifications.append(encounter_id)
            if self.last_notification:
                difference = time.time() - self.last_notification
                self.differences.append(difference)
                average = mean(self.differences)
                if average < config.DESIRED_FREQUENCY[0]:
                    self.decrease_range()
                    with open('range_log.txt', 'at') as f:
                        f.write('Average: ' + str(round(average)) + ', decreasing range to ' + str(self.notify_ranking) + '\n')
                elif average > config.DESIRE_FREQUENCY[1]:
                    self.increase_range()
                    with open('range_log.txt', 'at') as f:
                        f.write('Average: ' + str(round(average)) + ', increasing range to ' + str(self.notify_ranking) + '\n')
                else:
                    with open('range_log.txt', 'at') as f:
                        f.write('Average: ' + str(round(average)) + ', so keeping the range at ' + str(self.notify_ranking) + '\n')
            self.last_notification = time.time()
        return (code, explanation)
