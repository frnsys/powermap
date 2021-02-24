import config from './config';
// import mapboxgl from 'mapbox-gl';
// import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = config.MAPBOX_TOKEN;

const tooltip = document.getElementById(`map-tooltip`);

const styles = (type, color) => {
  return {
    'circle': {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'], 5, 1, 10, 5
      ],
      'circle-stroke-color': '#000000',
      'circle-stroke-width': 1,
      'circle-color': color
    },
    'fill': {
      'fill-color': color,
      'fill-outline-color': '#000000',
      'fill-opacity': 0.25
    },
    'line': {
      'line-color': color,
      'line-width': 2
    }
  }[type];
};

const conf = {
  container: `map`,
  style: 'mapbox://styles/mapbox/satellite-streets-v11',
  zoom: 5.8,
  maxZoom: 12,
  minZoom: 2,
  center: [-75.40770744775523, 42.8821336509194]
};

const geojsons = [
  ['electric_retail_service_territories', 'fill', '#FB89AD'],
  ['electric_power_transmission_lines', 'line', '#FFAF00'],
  ['hospitals', 'circle', '#D2275A'],
  ['urgent_care_facilities', 'circle', '#D2275A'],
  ['power_plants', 'circle', '#2C84FC'],
  ['electric_substations', 'circle', '#1E59AA'],
];
// const sources = {
//   'background': {
//     'type': 'vector',
//     'url': `mapbox://${config.MAP_ID}`
//   },
// };
const sources = {};
geojsons.forEach((gj) => {
  let name = gj[0];
  sources[name] = {
    'type': 'geojson',
    'data': `assets/geojson/${name}.geojson`
  };
});

// const layers = [{
//   'id': 'background',
//   'type': 'fill',
//   'source': 'background',
//   'paint': styles.defaultPlaces
// }];
const layers = [];
geojsons.forEach((gj) => {
  let [name, type, color] = gj;
  layers.push({
    'id': name,
    'type': type,
    'source': name,
    'paint': styles(type, color)
  });
});

const map = new mapboxgl.Map(conf);
map.dragRotate.disable();
map.touchZoomRotate.disableRotation();
map.on('dragstart', () => {
  tooltip.style.display = 'none';
});

map.on('load', () => {
  Object.keys(sources).forEach((s) => {
    map.addSource(s, sources[s]);
  });

  layers.forEach((l) => {
    map.addLayer(l);
  });
});

const props = {
  'electric_retail_service_territories': (props) => props['NAME'],
  'hospitals': (props) => props['NAME'],
  'urgent_care_facilities': (props) => props['NAME'],
  'electric_substations': (props) => props['NAME'],
  'power_plants': (props) => `${props['NAME']} (${props['NAICS_DESC']})`,
  'electric_power_transmission_lines': (props) => `Type:${props['TYPE']}`,
};

const onMouseMove = (haveNew, features, ev) => {
  // Ignore at low zoom levels, gets really choppy
  if (map.getZoom() <= 6) return;

  if (Object.keys(features).length > 0) {
    tooltip.style.left = `${ev.originalEvent.offsetX+10}px`;
    tooltip.style.top = `${ev.originalEvent.offsetY+10}px`;
    if (haveNew) {
      tooltip.style.display = 'block';
      tooltip.innerHTML = Object.keys(features).map((k) => {
        let feats = features[k];
        return `<h3>${k}</h3>
          <div>${feats.map((f) => {
            return props[k](f['properties']);
          }).join('<br />')}</div>`;
      }).join('<br />');
    }
  } else {
    tooltip.style.display = 'none';
  }
}

// Cache current features under mouse
let featuresUnderMouse = {};
map.on('mousemove', (e) => {
  // Be conservative in running mousemove responses,
  // since it can be a big performance hit
  if (!map.isMoving() && !map.isZooming()) {
    let features = map.queryRenderedFeatures(e.point);
    features = features.reduce((acc, feat) => {
      let k = feat.source;
      if (k in sources) {
        if (!(k in acc)) {
          acc[k] = [];
        }
        acc[k].push(feat);
      }
      return acc;
    }, {});
    let haveNew = Object.keys(features).some((k) => {
      return features[k].filter(x => {
        return !featuresUnderMouse[k] || !featuresUnderMouse[k].has(x.id);
      }).length > 0;
    });
    if (haveNew) {
      featuresUnderMouse = Object.keys(features).reduce((acc, s) => {
        acc[s] = new Set(features[s].map((f) => f.id));
        return acc;
      }, {});
    }
    onMouseMove(haveNew, features, e);
  }
});

// Reference
window.getCenter = () => map.getCenter();
window.getZoom = () => map.getZoom();