import config


def get_start_coords(worker_no):
    """
    Returns center of square for given worker
    """
    total_workers = config.GRID[0] * config.GRID[1]
    per_column = total_workers / config.GRID[0]
    column = worker_no % per_column
    row = worker_no / per_column
    part_lat = (config.MAP_END[0] - config.MAP_START[0]) / float(config.GRID[0])
    part_lon = (config.MAP_END[1] - config.MAP_START[1]) / float(config.GRID[1])
    start_lat = config.MAP_START[0] + part_lat * row + part_lat / 2
    start_lon = config.MAP_START[1] + part_lon * column + part_lon / 2
    return start_lat, start_lon
