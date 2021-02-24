import os
import json
import fiona
import pyproj
from glob import glob
from tqdm import tqdm
from shapely.ops import transform
from shapely.geometry import shape, mapping

# WGS84
ny_gj = json.load(open('src/ny.geojson'))
ny_shape = shape(ny_gj['geometry'])

os.environ["GDAL_DATA"] = "." # Needs gcs.csv
proj = pyproj.Transformer.from_crs(
    pyproj.CRS('EPSG:3857'),
    pyproj.CRS('EPSG:4326'), # WGS84
    always_xy=True
)

def transform_geom(geom):
    return transform(proj.transform, shape(geom))

def transform_feat(feat):
    feat['geometry'] = mapping(transform_geom(feat['geometry']))
    return feat


# Process each shapefile in to geojson
for shpfile in tqdm(glob('src/**/*.shp')):
    feats = fiona.open(shpfile)
    outpath = f"gen/geojson/{shpfile.split('/')[1]}.geojson"

    # feats.crs == EPSG:3857
    # print(shpfile, feats.crs)

    # Only keep data for NY
    # Transmission lines don't have states, so have to treat these differently
    if shpfile == 'src/electric_power_transmission_lines/Transmission_Lines.shp':
        keep = [transform_feat(feat) for feat in feats if
                transform_geom(feat['geometry']).intersects(ny_shape)]
    else:
        keep = [transform_feat(feat) for feat in feats if feat['properties']['STATE'] == 'NY']

    geojson = {
        'type': 'FeatureCollection',
        'features': keep
    }
    with open(outpath, 'w') as f:
        json.dump(geojson, f)
