import { Planner } from "plannerjs";
import React from "react";
import ReactMapboxGl, { Feature, Layer } from "react-mapbox-gl";
import MapToolbar from './maptoolbar';

const Map = ReactMapboxGl({
  accessToken:
    "pk.eyJ1Ijoid291dGVydmRkIiwiYSI6ImNqczRvbzRlMzA2a2UzeWx4MHlqem1lajYifQ.-kYtzbZnQhJTVeh8zDfgYg"
});


const markerFromGeojson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [0, 0]
      }
    }
  ]
};
const markerToGeojson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [0, 0]
      }
    }
  ]
};

const lineLayout = {
  "line-cap": "round",
  "line-join": "round"
};

const linePaint = {
  "line-color": "#B52700",
  "line-width": 8
};

const savedRouteLinePaint = {
  'line-color': '#BABABA',
  'line-width': 5
};

const containerStyle = {
  height: "80vh",
  width: "100%",
  cursor: ''
};


class MapPannel extends React.Component{
    
    constructor(props) {
      super(props);
      this.state = {
        center: [4.5118, 50.6282],  //should be props?
        zoom: [6.83],
        calculating: false,
        from_marker: {
          placed: false,
          enabled: false,
          dragging: false,
          lngLat: undefined
        },
        to_marker: {
          placed: false,
          enabled: false,
          dragging: false,
          lngLat: undefined
        },
        active_route: {
          key: undefined,
          text: undefined,
          coordinates: []
        },
        saved_routes: [],
        selectable_routes: [],
        selected_routes: [],
        container_style: containerStyle
      };

    this.createFromMarker = this.createFromMarker.bind(this);
    this.createToMarker = this.createToMarker.bind(this);
    this.onStyleLoad = this.onStyleLoad.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseClick = this.onMouseClick.bind(this);
    this.calculateRoute = this.calculateRoute.bind(this);
    this.handleSelectedRoutesChange = this.handleSelectedRoutesChange.bind(this);
    this.handleSelectedRouteAddition = this.handleSelectedRouteAddition.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.planner = new Planner();
    this.planner.setProfileID("PEDESTRIAN");
  }

  componentDidUpdate(pervProps){
    if(pervProps.configFile !== this.props.configFile){
      this.planner.setDevelopmentProfile(this.props.configFile);
      console.log("config file loaded:");
      console.log(this.props.configFile);
    }
    
  }


  calculateRoute() {
    if (this.state.from_marker.placed && this.state.to_marker.placed && !this.state.calculating) {
      this.setState({ calculating: true });
      let query = {
        roadNetworkOnly: true,  // don't mix with publicTransportOnly, for obvious reasons
        from: { latitude: this.state.from_marker.lngLat.lat, longitude: this.state.from_marker.lngLat.lng },
        to: { latitude: this.state.to_marker.lngLat.lat, longitude: this.state.to_marker.lngLat.lng }
      };
      console.log(query);
      console.log("waiting...");
      console.log("querying planner.js...");
      this.planner.query(query)
        .take(1)
        .on("error", (error) => {
          console.log(error);
        })
        .on("data", (path) => {
          //console.log("got result:");
          //console.log(JSON.stringify(path, null, " "));
          let route_coordinates = [];
          path.steps.forEach((step) => {
            route_coordinates.push([step.startLocation.longitude, step.startLocation.latitude]);
            route_coordinates.push([step.stopLocation.longitude, step.stopLocation.latitude]);
          });
          //console.log(coordinates);
          let date = new Date();
          this.setState(prevState => ({
            active_route: {
              key: prevState.saved_routes.length,
              text: date.toISOString(),
              coordinates: route_coordinates
            }
          }));
        })
        .on("end", () => {
          console.log("end\n");
          this.setState({ calculating: false });
        });
    }
  }

  saveCurrentRoute(label) {
    //set the label
    this.setState(prevState => ({
      active_route: {
        key: prevState.active_route.key,
        text: label,
        coordinates: prevState.active_route.coordinates
      }
    }));
    let key = this.state.active_route.key;
    let routeExists = false;
    this.state.saved_routes.forEach((route) => {
      if (route.key === key) {
        routeExists = true;
        return;
      }
    });
    if (!routeExists) {
      this.setState(prevState => ({
        saved_routes: [prevState.active_route, ...prevState.saved_routes],
        selectable_routes: [{ key: prevState.active_route.key, text: prevState.active_route.text, value: prevState.active_route.key }, 
                            ...prevState.selectable_routes]
      }));
    }

    console.log(this.state.saved_routes);
  }

  onMouseUp(map, e) {
    var coords = e.lngLat;
    if (this.state.from_marker.dragging) {
      this.setState(prevState => ({
        from_marker: {
          placed: prevState.from_marker.placed,
          enabled: prevState.from_marker.enabled,
          dragging: false,
          lngLat: coords
        }
      }));
      this.calculateRoute();
    }
    else if (this.state.to_marker.dragging) {
      this.setState(prevState => ({
        to_marker: {
          placed: prevState.to_marker.placed,
          enabled: prevState.to_marker.enabled,
          dragging: false,
          lngLat: coords
        }
      }));
      this.calculateRoute();
    }
  }
  onStyleLoad(map, e) {
    map.addSource('from_marker', {
      "type": "geojson",
      "data": markerFromGeojson
    });
    map.addSource('to_marker', {
      "type": "geojson",
      "data": markerToGeojson
    });
    map.addLayer({
      "id": "from_marker",
      "type": "circle",
      "source": "from_marker",
      "paint": {
        "circle-radius": 10,
        "circle-color": "#3887be"
      }
    });
    map.addLayer({
      "id": "to_marker",
      "type": "circle",
      "source": "to_marker",
      "paint": {
        "circle-radius": 10,
        "circle-color": "#6b7cff"
      }
    });    

      let parent = this;
      // When the cursor enters a feature in the point layer, prepare for dragging.
      map.on('mouseenter', 'from_marker', function() {
        map.setPaintProperty('from_marker', 'circle-color', '#3bb2d0');
        containerStyle.cursor = "move";
        parent.setState({container_style: containerStyle});
      });
          
      map.on('mouseleave', 'from_marker', function() {
        map.setPaintProperty('from_marker', 'circle-color', '#3887be');
        containerStyle.cursor = "";
        parent.setState({container_style: containerStyle});
      });
      
      map.on('mousedown', 'from_marker', function(e) {
        // Prevent the default map drag behavior.
        e.preventDefault();
        
        parent.setState(prevState => ({
          from_marker: {
            placed: prevState.from_marker.placed,
            enabled: prevState.from_marker.enabled,
            dragging: true,
            lngLat: prevState.from_marker.lngLat
          }
        }));
        containerStyle.cursor = "grab";
        parent.setState({container_style: containerStyle});
      });

      map.on('mouseenter', 'to_marker', function() {
        map.setPaintProperty('to_marker', 'circle-color', '#3bb2d0');
        containerStyle.cursor = "move";
        parent.setState({container_style: containerStyle});
      });
          
      map.on('mouseleave', 'to_marker', function() {
        map.setPaintProperty('to_marker', 'circle-color', '#9f7feb');
        containerStyle.cursor = "";
        parent.setState({container_style: containerStyle});
      });
      
      map.on('mousedown', 'to_marker', function(e) {
        // Prevent the default map drag behavior.
        e.preventDefault();
        parent.setState(prevState => ({
          to_marker: {
            placed: prevState.to_marker.placed,
            enabled: prevState.to_marker.enabled,
            dragging: true,
            lngLat: prevState.to_marker.lngLat
          }
        }));
        containerStyle.cursor = "grab";
        parent.setState({container_style: containerStyle});
      });
    }

  onMouseClick(map, evt) {
    var coords = evt.lngLat;
    if (this.state.from_marker.enabled && !this.state.from_marker.placed && !this.state.from_marker.dragging) {
      console.log("placed from-marker at " + this.state.from_marker.lngLat);
      this.setState(prevState => ({
        from_marker: {
          placed: true,
          enabled: true,
          dragging: false,
          lngLat: coords
        }
      }));
      console.log(this.state.from_marker);
    }
    if (this.state.to_marker.enabled && !this.state.to_marker.placed && !this.state.to_marker.dragging) {
      console.log("placed to-marker at " + this.state.to_marker.lngLat);
      this.setState(prevState => ({
        to_marker: {
          placed: true,
          enabled: true,
          dragging: false,
          lngLat: coords
        }
      }));
      console.log(this.state.to_marker);
    }
    
    if(this.state.from_marker.enabled && this.state.to_marker.enabled
      && (JSON.stringify([this.state.from_marker.lngLat.lng, this.state.from_marker.lngLat.lat])
          !== JSON.stringify(this.state.active_route.coordinates[0])
      ||  JSON.stringify([this.state.to_marker.lngLat.lng, this.state.to_marker.lngLat.lat])
          !== JSON.stringify(this.state.active_route.coordinates[this.state.active_route.coordinates.length -1]))){
      this.calculateRoute();
    }
  }

  onMouseMove(map, evt) {
    if (this.state.from_marker.enabled && !this.state.from_marker.placed && !this.state.from_marker.dragging) {
      markerFromGeojson.features[0].geometry.coordinates = [evt.lngLat.lng, evt.lngLat.lat];
      map.getSource('from_marker').setData(markerFromGeojson);
    }
    else if (this.state.to_marker.enabled && !this.state.to_marker.placed && !this.state.to_marker.dragging) {
      markerToGeojson.features[0].geometry.coordinates = [evt.lngLat.lng, evt.lngLat.lat];
      map.getSource('to_marker').setData(markerToGeojson);
    }
    if (this.state.from_marker.dragging) {
      markerFromGeojson.features[0].geometry.coordinates = [evt.lngLat.lng, evt.lngLat.lat];
      map.getSource('from_marker').setData(markerFromGeojson);
    } else if (this.state.to_marker.dragging) {
      markerToGeojson.features[0].geometry.coordinates = [evt.lngLat.lng, evt.lngLat.lat];
      map.getSource('to_marker').setData(markerToGeojson);
    }
  }

  createFromMarker() {
    console.log(this.state.from_marker)
    this.setState(prevState => ({
      from_marker: {
        placed: false,
        enabled: true,
        dragging: prevState.from_marker.dragging,
        lngLat: prevState.from_marker.lngLat
      }
    }));
  }

  createToMarker() {
    console.log(this.state.to_marker.lngLat)
    this.setState(prevState => ({
      to_marker: {
        placed: false,
        enabled: true,
        dragging: prevState.to_marker.dragging,
        lngLat: prevState.to_marker.lngLat
      }
    }));
  }

  handleSelectedRouteAddition = (e, { value }) => {
    console.log("hadleAddition value");
    console.log(value);
    this.setState(prevState => ({
      selectable_routes: [...prevState.selectable_routes, { key: value, text: value, value }],
    }))
  }

  handleSelectedRoutesChange = (e, { value }) => {
    console.log("hadleChange value");
    console.log(value);
    console.log(this.state.saved_routes);
    this.setState({ selected_routes: value })
  }

  render() {
    const { center, zoom, from_marker, to_marker } = this.state;
    const routesToDraw = this.state.selected_routes.map((k) => {
      let size = this.state.saved_routes.length;
      let i = 0;
      while (this.state.saved_routes[i].key != k && i < size) {
        i++;
      }
      return (
        <Layer type="line" layout={lineLayout} paint={savedRouteLinePaint}>
          <Feature coordinates={this.state.saved_routes[i].coordinates} />
        </Layer>
      );
    }

    );
    return (
      <div style={{height: '100%', width: '100%'}}>
        <MapToolbar style={{height: '20vh', width: '100vh'}}
              calculating={this.state.calculating}
              from_marker={this.state.from_marker}
              to_marker={this.state.to_marker}
              createFromMarker={this.createFromMarker}
              createToMarker={this.createToMarker}
              selectable_routes={this.state.selectable_routes}
              selected_routes={this.state.selected_routes}
              handleSelectedRouteAddition={this.handleSelectedRouteAddition}
              handleSelectedRoutesChange={this.handleSelectedRoutesChange}
              calculateRoute={this.calculateRoute}
              saveCurrentRoute={this.saveCurrentRoute}/>
        <Map
          style="mapbox://styles/mapbox/streets-v11"
          containerStyle={ this.state.container_style } 
          center={ center }
          zoom={ zoom }
          onStyleLoad={this.onStyleLoad}
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp}
          onClick={this.onMouseClick}>
            <Layer type="line" layout={lineLayout} paint={linePaint}>
                <Feature coordinates={ this.state.active_route.coordinates } />
            </Layer>
            {routesToDraw}
        </Map>
      </div>
        );
      }
}

export default MapPannel;
