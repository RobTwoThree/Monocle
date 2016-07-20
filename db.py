from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String


try:
    from db_config import *
except ImportError:
    DB_ENGINE = 'sqlite:///db.sqlite'


def get_engine():
    return create_engine(
        'sqlite:///db.sqlite',
        echo=True
    )

Base = declarative_base()


class Sighting(Base):
    __tablename__ = 'sightings'

    id = Column(Integer, primary_key=True)
    pokemon_id = Column(Integer)
    expire_timestamp = Column(Integer)
    normalized_timestamp = Column(Integer)
    lat = Column(String)
    lon = Column(String)


Session = sessionmaker(bind=get_engine())


def normalize_timestamp(timestamp):
    return int(float(timestamp) / 120.0) * 120


def add_sighting(session, pokemon):
    obj = Sighting(
        pokemon_id=pokemon['id'],
        expire_timestamp=pokemon['disappear_time'],
        normalized_timestamp=normalize_timestamp(pokemon['disappear_time']),
        lat=pokemon['lat'],
        lon=pokemon['lng'],
    )
    # Check if there isn't the same entry already
    existing = session.query(Sighting) \
        .filter(Sighting.pokemon_id == obj.pokemon_id) \
        .filter(Sighting.normalized_timestamp == obj.normalized_timestamp) \
        .filter(Sighting.lat == obj.lat) \
        .filter(Sighting.lon == obj.lon) \
        .first()
    if existing:
        return
    session.add(obj)
