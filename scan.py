#!/usr/bin/env python3

from datetime import datetime
from multiprocessing.managers import BaseManager, DictProxy
from statistics import median
from threading import Thread, active_count, Semaphore
from os import system
from sys import platform
from random import uniform, shuffle
from queue import Queue, Full
from signal import signal, SIGINT, SIG_IGN
from argparse import ArgumentParser
from logging import getLogger, basicConfig, WARNING, INFO
from collections import deque
from pgoapi.hash_server import HashServer
from sqlalchemy.exc import OperationalError, ProgrammingError

import asyncio
import time

try:
    import _thread
except ImportError:
    import _dummy_thread as _thread

try:
    from uvloop import EventLoopPolicy

    asyncio.set_event_loop_policy(EventLoopPolicy())
except ImportError:
    pass

from db import SIGHTING_CACHE
from utils import get_current_hour, dump_pickle, get_address, get_start_coords, get_bootstrap_points

try:
    import config
except ModuleNotFoundError as e:
    raise ModuleNotFoundError('Please copy config.example.py to config.py and customize it.') from e

# Check whether config has all necessary attributes
_required = (
    'DB_ENGINE',
    'GRID',
    'MAP_START',
    'MAP_END'
)
for setting_name in _required:
    if not hasattr(config, setting_name):
        raise RuntimeError('Please set "{}" in config'.format(setting_name))

# Set defaults for missing config options
_optional = {
    'PROXIES': None,
    'NOTIFY_IDS': None,
    'NOTIFY_RANKING': None,
    'CONTROL_SOCKS': None,
    'HASH_KEY': None,
    'MAX_CAPTCHAS': 0,
    'ACCOUNTS': (),
    'ENCOUNTER': None,
    'NOTIFY': False,
    'AUTHKEY': b'm3wtw0',
    'NETWORK_THREADS': round((config.GRID[0] * config.GRID[1]) / 15) + 1,
    'SPIN_POKESTOPS': False,
    'SPIN_COOLDOWN': 300,
    'COMPLETE_TUTORIAL': False,
    'INCUBATE_EGGS': False,
    'MAP_WORKERS': True,
    'APP_SIMULATION': True,
    'ITEM_LIMITS': None,
    'MAX_RETRIES': 3,
    'MORE_POINTS': True,
    'GIVE_UP_KNOWN': 60,
    'GIVE_UP_UNKNOWN': 20,
    'SKIP_SPAWN': 90
}
for setting_name, default in _optional.items():
    if not hasattr(config, setting_name):
        setattr(config, setting_name, default)

# validate PROXIES input and cast to set if needed
if config.PROXIES:
    if isinstance(config.PROXIES, (tuple, list)):
        config.PROXIES = set(config.PROXIES)
    elif isinstance(config.PROXIES, str):
        config.PROXIES = {config.PROXIES}
    elif not isinstance(config.PROXIES, set):
        raise ValueError('PROXIES must be either a list, set, tuple, or str.')

# ensure that user's latitudes and longitudes are different
if (config.MAP_START[0] == config.MAP_END[0]
        or config.MAP_START[1] == config.MAP_END[1]):
    raise ValueError('The latitudes and longitudes of your MAP_START and MAP_END must differ.')

# disable bag cleaning if not spinning PokéStops
if config.ITEM_LIMITS and not config.SPIN_POKESTOPS:
    config.ITEM_LIMITS = None

# ensure that numbers are valid
try:
    if config.SCAN_DELAY < 10:
        raise ValueError('SCAN_DELAY must be at least 10.')
except (TypeError, AttributeError):
    config.SCAN_DELAY = 10
try:
    if config.SPEED_LIMIT > 25:
        raise ValueError('Speeds over 25MPH would probably cause problems.')
except (TypeError, AttributeError):
    config.SPEED_LIMIT = 19
try:
    if config.SIMULTANEOUS_LOGINS < 1:
        raise ValueError('SIMULTANEOUS_LOGINS must be at least 1.')
except (TypeError, AttributeError):
    config.SIMULTANEOUS_LOGINS = 4

if config.ENCOUNTER not in (None, 'notifying', 'all'):
    raise ValueError("Valid ENCOUNTER settings are: None, 'notifying', and 'all'")

from worker import Worker

BAD_STATUSES = (
    'FAILED LOGIN',
    'EXCEPTION',
    'NOT AUTHENTICATED'
    'BAD LOGIN',
    'HASHING OFFLINE',
    'NIANTIC OFFLINE',
    'THROTTLE',
    'CAPTCHA',
    'BANNED',
    'BENCHING',
    'REMOVING',
    'IP BANNED',
    'MALFORMED RESPONSE',
    'PGOAPI ERROR',
    'MAX RETRIES',
    'HASHING ERROR'
)


class AccountManager(BaseManager):
    pass


class CustomQueue(Queue):
    def full_wait(self, maxsize=0, timeout=None):
        '''Block until queue size falls below maxsize'''
        starttime = time.monotonic()
        with self.not_full:
            if maxsize > 0:
                if timeout is None:
                    while self._qsize() >= maxsize:
                        self.not_full.wait()
                elif timeout < 0:
                    raise ValueError("'timeout' must be a non-negative number")
                else:
                    endtime = time.monotonic() + timeout
                    while self._qsize() >= maxsize:
                        remaining = endtime - time.monotonic()
                        if remaining <= 0.0:
                            raise Full
                        self.not_full.wait(remaining)
            self.not_empty.notify()
        endtime = time.monotonic()
        return endtime - starttime


_captcha_queue = CustomQueue()
_extra_queue = Queue()
_worker_dict = {}

def get_captchas():
    return _captcha_queue

def get_extras():
    return _extra_queue

def get_workers():
    return _worker_dict

def mgr_init():
    signal(SIGINT, SIG_IGN)


def parse_args():
    parser = ArgumentParser()
    parser.add_argument(
        '--no-status-bar',
        dest='status_bar',
        help='Log to console instead of displaying status bar',
        action='store_false'
    )
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default=WARNING
    )
    parser.add_argument(
        '--bootstrap',
        dest='bootstrap',
        help='Bootstrap even if spawns are known.',
        action='store_true'
    )
    parser.add_argument(
        '--no-pickle',
        dest='pickle',
        help='Do not load spawns from pickle',
        action='store_false'
    )
    return parser.parse_args()


def configure_logger(filename='worker.log'):
    basicConfig(
        filename=filename,
        format=(
            '[%(asctime)s][%(levelname)8s][%(name)s] '
            '%(message)s'
        ),
        style='%',
        level=INFO,
    )


def exception_handler(loop, context):
    logger = getLogger('eventloop')
    logger.exception('A wild exception appeared!')
    logger.error(context)


class Overseer:
    db_processor = Worker.db_processor
    spawns = Worker.spawns
    accounts = Worker.accounts
    loop = asyncio.get_event_loop()

    def __init__(self, status_bar, manager):
        self.logger = getLogger('overseer')
        self.workers = {}
        self.manager = manager
        self.count = config.GRID[0] * config.GRID[1]
        self.start_date = datetime.now()
        self.status_bar = status_bar
        self.things_count = []
        self.paused = False
        self.killed = False
        self.coroutines_count = 0
        self.skipped = 0
        self.visits = 0
        self.searches_without_shuffle = 0
        self.mysteries = deque()
        self.coroutine_semaphore = Semaphore(self.count)
        self.redundant = 0
        self.all_seen = False
        self.idle_seconds = 0
        self.logger.info('Overseer initialized')

    def start(self):
        self.captcha_queue = self.manager.captcha_queue()
        Worker.captcha_queue = self.manager.captcha_queue()
        self.extra_queue = self.manager.extra_queue()
        Worker.extra_queue = self.manager.extra_queue()
        if config.MAP_WORKERS:
            Worker.worker_dict = self.manager.worker_dict()

        for username, account in self.accounts.items():
            account['username'] = username
            if account.get('captcha'):
                self.captcha_queue.put(account)
            else:
                self.extra_queue.put(account)

        for worker_no in range(self.count):
            self.start_worker(worker_no)
        self.workers_list = list(self.workers.values())
        self.db_processor.start()

    def start_worker(self, worker_no):
        worker = Worker(worker_no=worker_no)
        self.workers[worker_no] = worker

    def check(self):
        now = time.monotonic()
        last_commit = now
        last_cleaned_cache = now
        last_things_found_updated = now
        last_swap = now
        last_stats_updated = 0

        while not self.killed:
            try:
                now = time.monotonic()
                # Clean cache
                if now - last_cleaned_cache > 900:  # clean cache after 15min
                    self.db_processor.clean_cache()
                    last_cleaned_cache = now
                if now - last_commit > 5:
                    self.db_processor.commit()
                    last_commit = now
                if not self.paused and now - last_swap > 600:
                    if not self.extra_queue.empty():
                        worst, per_minute = self.least_productive()
                        if worst:
                            asyncio.run_coroutine_threadsafe(
                                worst.swap_account(
                                    reason='only {:.1f} seen per minute'.format(per_minute),
                                    lock=True),
                                loop=self.loop
                            )
                    last_swap = now
                # Record things found count
                if not self.paused and now - last_stats_updated > 5:
                    self.seen_stats, self.visit_stats, self.delay_stats, self.speed_stats = self.get_visit_stats()
                    self.update_coroutines_count()
                    last_stats_updated = now
                if not self.paused and now - last_things_found_updated > 10:
                    self.things_count = self.things_count[-9:]
                    self.things_count.append(str(self.db_processor.count))
                    last_things_found_updated = now
                if self.status_bar:
                    if platform == 'win32':
                        _ = system('cls')
                    else:
                        _ = system('clear')
                    print(self.get_status_message())

                if self.paused:
                    time.sleep(15)
                else:
                    time.sleep(.5)
            except Exception as e:
                self.logger.exception(e)
        # OK, now we're killed
        try:
            while (self.coroutines_count > 0 or
                       self.coroutines_count == '?' or
                       not self.db_processor.queue.empty()):
                try:
                    self.coroutines_count = sum(not t.done()
                                            for t in asyncio.Task.all_tasks(self.loop))
                except RuntimeError:
                    self.coroutines_count = 0
                pending = self.db_processor.queue.qsize()
                # Spaces at the end are important, as they clear previously printed
                # output - \r doesn't clean whole line
                print(
                    '{c} coroutines active, {d} DB items pending   '.format(
                        c=self.coroutines_count, d=pending),
                    end='\r'
                )
                time.sleep(.5)
        except Exception as e:
            self.logger.exception(e)
        finally:
            self.db_processor.queue.put({'type': 'kill'})
            print('Done.                                          ')

    @staticmethod
    def generate_stats(somelist):
        return {
            'max': max(somelist),
            'min': min(somelist),
            'med': median(somelist)
        }

    def get_visit_stats(self):
        visits = []
        seconds_since_start = time.monotonic() - START_TIME - self.idle_seconds
        hours_since_start = seconds_since_start / 3600
        seconds_per_visit = []
        seen_per_worker = []
        after_spawns = []
        speeds = []

        for w in self.workers.values():
            if w.after_spawn:
                after_spawns.append(w.after_spawn)
            seen_per_worker.append(w.total_seen)
            visits.append(w.visits)
            speeds.append(w.speed)
        if after_spawns:
            delay_stats = self.generate_stats(after_spawns)
        else:
            delay_stats = {'min': 0, 'max': 0, 'med': 0}
        seen_stats = self.generate_stats(seen_per_worker)
        visit_stats = self.generate_stats(visits)
        speed_stats = self.generate_stats(speeds)
        return seen_stats, visit_stats, delay_stats, speed_stats

    def get_dots_and_messages(self):
        """Returns status dots and status messages for workers

        Dots meaning:
        . = visited more than a minute ago
        , = visited less than a minute ago, no pokemon seen
        0 = visited less than a minute ago, no pokemon or forts seen
        : = visited less than a minute ago, pokemon seen
        ! = currently visiting
        | = cleaning bag
        $ = spinning a PokéStop
        * = sending a notification
        ~ = encountering a Pokémon
        I = initial, haven't done anything yet
        ^ = waiting to log in (limited by SIMULTANEOUS_LOGINS)
        ∞ = bootstrapping
        L = logging in
        A = simulating app startup
        T = completing the tutorial
        X = something bad happened
        H = waiting for the next period on the hashing server
        C = CAPTCHA

        Other letters: various errors and procedures
        """
        dots = []
        messages = []
        row = []
        for i, worker in enumerate(self.workers.values()):
            if i > 0 and i % config.GRID[1] == 0:
                dots.append(row)
                row = []
            if worker.error_code in BAD_STATUSES:
                row.append('X')
                messages.append(worker.status.ljust(20))
            elif worker.error_code:
                row.append(worker.error_code[0])
            else:
                row.append('.')
        if row:
            dots.append(row)
        return dots, messages

    def update_coroutines_count(self):
        try:
            self.coroutines_count = len(asyncio.Task.all_tasks(self.loop))
        except RuntimeError:
            # Set changed size during iteration
            self.coroutines_count = '?'

    def get_status_message(self):
        running_for = datetime.now() - self.start_date

        seconds_since_start = time.monotonic() - START_TIME - self.idle_seconds
        hours_since_start = seconds_since_start / 3600
        visits_per_second = self.visits / seconds_since_start

        output = [
            'PokeMiner running for {}'.format(running_for),
            'Known spawns: {s}, unknown: {m}'.format(
                s=len(self.spawns),
                m=self.spawns.mysteries_count),
            '{w} workers, {t} threads, {c} coroutines'.format(
                w=self.count,
                t=active_count(),
                c=self.coroutines_count),
            '',
            'Seen per worker: min {min}, max {max}, med {med:.0f}'.format(
                **self.seen_stats),
            'Visits per worker: min {min}, max {max:}, med {med:.0f}'.format(
                **self.visit_stats),
            'Visit delay: min {min:.1f}, max {max:.1f}, med {med:.1f}'.format(
                **self.delay_stats),
            'Speed: min {min:.1f}, max {max:.1f}, med {med:.1f}'.format(
                **self.speed_stats),
            'Extra accounts: {a}, CAPTCHAs needed: {c}'.format(
                a=self.extra_queue.qsize(),
                c=self.captcha_queue.qsize()),
            '',
            'Pokemon found count (10s interval):',
            ' '.join(self.things_count),
            '',
            'Visits: {v}, per second: {ps:.2f}'.format(
                v=self.visits,
                ps=visits_per_second),
            'Skipped: {s}, unnecessary: {u}'.format(
                s=self.skipped,
                u=self.redundant)
        ]

        try:
            seen = Worker.g['seen']
            captchas = Worker.g['captchas']
            sent = Worker.g.get('sent')
            output.append('Seen per visit: {v:.2f}, per minute: {m:.0f}'.format(
                v=seen / self.visits, m=seen / (seconds_since_start / 60)))

            if captchas:
                captchas_per_request = captchas / (self.visits / 1000)
                captchas_per_hour = captchas / hours_since_start
                output.append(
                    'CAPTCHAs per 1K visits: {r:.1f}, per hour: {h:.1f}'.format(
                    r=captchas_per_request, h=captchas_per_hour))
        except ZeroDivisionError:
            pass

        if config.HASH_KEY:
            try:
                refresh = HashServer.status.get('period') - time.time()
                output.append('Hashes: {r}/{m}, refresh in {t:.0f}'.format(
                    r=HashServer.status.get('remaining'),
                    m=HashServer.status.get('maximum'),
                    t=refresh
                ))
            except TypeError:
                pass

        if sent:
            output.append('Notifications sent: {n}, per hour {p:.1f}'.format(
                n=sent, p=sent / hours_since_start))

        output.append('')
        if not self.all_seen:
            no_sightings = ', '.join(str(w.worker_no)
                                     for w in self.workers.values()
                                     if w.total_seen == 0)
            if no_sightings:
                output += ['Workers without sightings so far:', no_sightings, '']
            else:
                self.all_seen = True

        dots, messages = self.get_dots_and_messages()
        output += [' '.join(row) for row in dots]
        previous = 0
        for i in range(4, len(messages) + 4, 4):
            output.append('\t'.join(messages[previous:i]))
            previous = i
        if self.paused:
            output += ('', 'CAPTCHAs are needed to proceed.')
        return '\n'.join(output)

    def least_productive(self):
        worker = None
        lowest = None
        workers = self.workers_list.copy()
        now = time.time()
        for account in workers:
            per_second = account.seen_per_second(now)
            if not lowest or (per_second and per_second < lowest):
                lowest = per_second
                worker = account
        try:
            per_minute = lowest * 60
            return worker, per_minute
        except TypeError:
            return None, None

    def get_start_point(self):
        smallest_diff = float('inf')
        now = time.time() % 3600
        closest = None

        for spawn_id, spawn in self.spawns.items():
            time_diff = now - spawn[1]
            if 0 < time_diff < smallest_diff:
                smallest_diff = time_diff
                closest = spawn_id
            if smallest_diff < 3:
                break
        return closest

    def launch(self, bootstrap, pickle):
        initial = True
        while not self.killed:
            if not initial:
                pickle = False
                bootstrap = False

            try:
                self.spawns.update(loadpickle=pickle)
            except OperationalError as e:
                if initial:
                    _thread.interrupt_main()
                    raise ValueError('Could not update spawns, ensure your DB is setup.') from e
                self.logger.exception('Operational error while trying to update spawns. {}')

            if not self.spawns or bootstrap:
                bootstrap = True
                pickle = False

            if bootstrap:
                try:
                    self.bootstrap()
                    time.sleep(1)
                    while self.coroutine_semaphore._value < (self.count / 2) and not self.killed:
                        time.sleep(2)
                    self.logger.warning('Starting bootstrap stage 2.')
                    self.bootstrap_two()
                    self.logger.warning('Finished bootstrapping.')
                except Exception:
                    self.logger.exception('An exception occurred during bootstrap.')

            while len(self.spawns) < 10 and not self.killed:
                try:
                    mystery_point = list(self.mysteries.popleft())
                    self.coroutine_semaphore.acquire()
                    asyncio.run_coroutine_threadsafe(
                        self.try_point(mystery_point), loop=self.loop
                    )
                except IndexError:
                    if self.spawns.mysteries or self.spawns.extra_mysteries:
                        self.mysteries = self.spawns.get_mysteries()
                    else:
                        config.MORE_POINTS = True
                        break

            current_hour = get_current_hour()
            if self.spawns.after_last():
                current_hour += 3600
                initial = False

            if initial:
                start_point = self.get_start_point()
                if not start_point:
                    initial = False
            else:
                dump_pickle('accounts', self.accounts)

            for spawn_id, spawn in self.spawns.items():
                try:
                    if initial:
                        if spawn_id == start_point:
                            initial = False
                        else:
                            continue

                    if self.captcha_queue.qsize() > config.MAX_CAPTCHAS:
                        self.paused = True
                        try:
                            self.idle_seconds += self.captcha_queue.full_wait(
                                maxsize=config.MAX_CAPTCHAS)
                        except (EOFError, BrokenPipeError):
                            pass
                        self.paused = False

                    point = list(spawn[0])
                    spawn_time = spawn[1] + current_hour

                    # negative = hasn't happened yet
                    # positive = already happened
                    time_diff = time.time() - spawn_time

                    while time_diff < 0 and not self.killed:
                        try:
                            mystery_point = list(self.mysteries.popleft())

                            self.coroutine_semaphore.acquire()
                            asyncio.run_coroutine_threadsafe(
                                self.try_point(mystery_point), loop=self.loop
                            )
                        except IndexError:
                            if self.spawns.mysteries or self.spawns.extra_mysteries:
                                self.mysteries = self.spawns.get_mysteries()
                            else:
                                config.MORE_POINTS = True
                                break
                        time_diff = time.time() - spawn_time

                    if time_diff > 5 and spawn_id in SIGHTING_CACHE.spawns:
                        self.redundant += 1
                        continue
                    elif time_diff > config.SKIP_SPAWN:
                        self.skipped += 1
                        continue

                    if self.killed:
                        return
                    self.coroutine_semaphore.acquire()
                    asyncio.run_coroutine_threadsafe(
                        self.try_point(point, spawn_time), loop=self.loop
                    )
                except Exception:
                    self.logger.exception('Error occured in launcher loop.')

    def bootstrap(self):
        async def visit_release(worker, point):
            try:
                await worker.busy.acquire()
                if await worker.bootstrap_visit(point):
                    self.visits += 1
            finally:
                try:
                    worker.busy.release()
                except (NameError, AttributeError, RuntimeError):
                    pass
                self.coroutine_semaphore.release()

        for worker in self.workers_list:
            number = worker.worker_no
            worker.bootstrap = True
            point = list(get_start_coords(number))
            time.sleep(.25)
            self.coroutine_semaphore.acquire()
            asyncio.run_coroutine_threadsafe(visit_release(worker, point),
                                             loop=self.loop)

    def bootstrap_two(self):
        async def bootstrap_try(point):
            try:
                worker = await self.best_worker(point, must_visit=True)
                if await worker.bootstrap_visit(point):
                    self.visits += 1
            finally:
                try:
                    worker.busy.release()
                except (NameError, AttributeError, RuntimeError):
                    pass
                self.coroutine_semaphore.release()

        for point in get_bootstrap_points():
            self.coroutine_semaphore.acquire()
            asyncio.run_coroutine_threadsafe(bootstrap_try(point), loop=self.loop)

    async def try_point(self, point, spawn_time=None):
        try:
            point[0] = uniform(point[0] - 0.00033, point[0] + 0.00033)
            point[1] = uniform(point[1] - 0.00033, point[1] + 0.00033)

            worker = await self.best_worker(point, spawn_time)

            if not worker:
                if spawn_time:
                    self.skipped += 1
                else:
                    self.mysteries.append(point)
                return
            try:
                if spawn_time:
                    if time.time() - spawn_time < 1:
                        await asyncio.sleep(1)
                    worker.after_spawn = time.time() - spawn_time

                if await worker.visit(point):
                    self.visits += 1
            finally:
                try:
                    worker.busy.release()
                except RunTimeError:
                    pass
        except Exception:
            self.logger.exception('An exception occurred in try_point')
        finally:
            self.coroutine_semaphore.release()

    async def best_worker(self, point, spawn_time=None, must_visit=False):
        if spawn_time:
            skip_time = time.monotonic() + config.GIVE_UP_KNOWN
        elif must_visit:
            skip_time = None
        else:
            skip_time = time.monotonic() + config.GIVE_UP_UNKNOWN

        limit = config.SPEED_LIMIT * 1.18  # slight buffer for inaccuracy
        half_limit = limit / 2

        lowest_speed = float('inf')
        self.searches_without_shuffle += 1
        if self.searches_without_shuffle > 500:
            shuffle(self.workers_list)
            self.searches_without_shuffle = 0
        workers = self.workers_list.copy()
        while True:
            speed = None
            lowest_speed = float('inf')
            for w in workers:
                speed = w.fast_speed(point)
                if speed and speed < lowest_speed and speed < limit:
                    if not w.busy.acquire_now():
                        continue
                    try:
                        worker.busy.release()
                    except (NameError, AttributeError, RuntimeError):
                        pass
                    lowest_speed = speed
                    worker = w

            try:
                speed = worker.accurate_speed(point)
                if speed > config.SPEED_LIMIT:
                    worker.busy.release()
                else:
                    worker.speed = speed
                    return worker
            except (NameError, AttributeError, RuntimeError):
                if self.killed:
                    return None
                if skip_time and time.monotonic() > skip_time:
                    return None
                await asyncio.sleep(2)
                worker = None

    def kill(self):
        self.killed = True
        print('Killing workers.')
        for worker in self.workers.values():
            worker.kill()

        while not self.extra_queue.empty():
            account = self.extra_queue.get()
            username = account.get('username')
            self.accounts[username] = account

if __name__ == '__main__':
    START_TIME = time.monotonic()

    args = parse_args()
    logger = getLogger()
    if args.status_bar:
        configure_logger(filename='scan.log')
        logger.info('-' * 30)
        logger.info('Starting up!')
    else:
        configure_logger(filename=None)
    logger.setLevel(args.log_level)

    AccountManager.register('captcha_queue', callable=get_captchas)
    AccountManager.register('extra_queue', callable=get_extras)
    if config.MAP_WORKERS:
        AccountManager.register('worker_dict', callable=get_workers,
                                proxytype=DictProxy)
    manager = AccountManager(address=get_address(), authkey=config.AUTHKEY)
    manager.start(mgr_init)

    loop = asyncio.get_event_loop()
    loop.set_exception_handler(exception_handler)

    overseer = Overseer(status_bar=args.status_bar, manager=manager)
    overseer.start()
    overseer_thread = Thread(target=overseer.check, name='overseer', daemon=True)
    overseer_thread.start()

    launcher_thread = Thread(target=overseer.launch, name='launcher', daemon=True, args=(args.bootstrap, args.pickle))
    launcher_thread.start()

    try:
        loop.run_forever()
    except KeyboardInterrupt:
        print('Exiting, please wait until all tasks finish')
        overseer.kill()

        dump_pickle('accounts', Worker.accounts)
        dump_pickle('cells', Worker.cell_ids)

        pending = asyncio.Task.all_tasks(loop=loop)
        try:
            loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        except Exception as e:
            print('Exception: {}'.format(e))

        Worker.db_processor.stop()

        try:
            Worker.spawns.update()
        except ProgrammingError:
            pass
        Worker.spawns.session.close()
        if config.NOTIFY:
            Worker.notifier.session.close()
        manager.shutdown()

        try:
            loop.close()
        except RuntimeError:
            pass
