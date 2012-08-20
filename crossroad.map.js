var MA_ZOOM_CITY = 12;
var MA_ZOOM_STREET = 16;
var MA_ZOOM_INIT = 16;
var MA_ZOOM_ROOF = 18;
var MA_PRECISION = 10000000;

function MAGMap(element_id) {
  var myOptions = {
    zoom : MA_ZOOM_INIT,
    mapTypeId : google.maps.MapTypeId.ROADMAP,
    scrollwheel : false,
    navigationControl : false,
    streetViewControl : false,
    mapTypeControl : false
  };
  this.map_handle = new google.maps.Map(document.getElementById(element_id), myOptions);
}

MAGMap.prototype.map_handle = null;
MAGMap.prototype.map_lng = null;
MAGMap.prototype.map_lat = null;
MAGMap.prototype.map_zoom = null;
MAGMap.prototype.map_markers = new Array();
MAGMap.prototype.image = new google.maps.MarkerImage('images/restaurant_blue_32.png', null, null, new google.maps.Point(12, 12), new google.maps.Size(24, 24));
MAGMap.prototype.image_man = new google.maps.MarkerImage('images/waiter_male_light_32.png', null, null, new google.maps.Point(16, 16));

MAGMap.prototype.suitable_zoom = function(location_type) {
  var zoom = MA_ZOOM_INIT;
  if(location_type == "ROOFTOP") {
    zoom = MA_ZOOM_ROOF;
  } else if(location_type == "GEOMETRIC_CENTER" || location_type == "RANGE_INTERPOLATED") {
    zoom = MA_ZOOM_STREET;
  } else if(location_type == "APPROXIMATE") {
    zoom = MA_ZOOM_CITY;
  }
  return zoom;
};

MAGMap.prototype.suitable_weight = function(MA_ZOOM_size){
  var weight = 10;
  switch(MA_ZOOM_size) {
    case MA_ZOOM_CITY:
      weight = 10;
    break;
    case MA_ZOOM_STREET:
      weight = 15;
    break;
    case MA_ZOOM_ROOF:
      weight = 40;
    break;
    default:
      weight = 10;
    break;
  }
  return weight;
};

MAGMap.prototype.suitable_radius = function(MA_ZOOM_size) {
  var radius = 100;
  switch(MA_ZOOM_size) {
    case MA_ZOOM_CITY:
      radius = 6000;
    break;
    case MA_ZOOM_STREET:
      radius = 450;
    break;
    case MA_ZOOM_ROOF:
      radius = 100;
    break;
    default:
      radius = 200;
    break;
  }
  return radius;
};

MAGMap.prototype.get_center = function() {
  var pos = new google.maps.LatLng(this.map_lat, this.map_lng);
  return pos;
};

MAGMap.prototype.set_center = function(lat, lng) {
  this.map_lng = lng;
  this.map_lat = lat;
  this.map_handle.setCenter(new google.maps.LatLng(this.map_lat, this.map_lng));
};

MAGMap.prototype.set_zoom = function(zoom) {
  this.map_zoom = zoom;
  this.map_handle.setZoom(zoom);
};

MAGMap.prototype.round = function(value) {
  return Math.round(value*MA_PRECISION)/MA_PRECISION;
}

MAGMap.prototype.add_marker = function(lat, lng, draggable, title) {
  var LatLng = new google.maps.LatLng(lat, lng);
  this.map_markers.push(new google.maps.Marker({
    position : LatLng,
    map : this.map_handle,
    icon : this.image,
    draggable : draggable,
    title : title,
    animation : google.maps.Animation.DROP
  }));
  return this.map_markers.length -1;
};

MAGMap.prototype.centrold = function(values, index) {
  var sum = 0;
  for(var i = 0; i < values.length; i++) {
    sum += values[i][index];
  }
  return this.round(sum/(values.length));
};

MAGMap.prototype.draw_circle_handle = null;
MAGMap.prototype.draw_circle = function() {
  var circleOption = {
    strokeColor : '#888888',
    strokeOpacity : 0.8,
    strokeWeight : this.suitable_weight(this.zoom),
    fillColor : '#000022',
    fillOpacity : 0.0,
    map : this.map_handle,
    center : this.get_center(),
    radius : this.suitable_radius(this.map_zoom)
  };
  if(this.draw_circle_handle == null) {
    this.draw_circle_handle = new google.maps.Circle(circleOption);
  } else {
    this.draw_circle_handle.setOptions(circleOption);
  }
  return this.draw_circle_handle;
}

MAGMap.prototype.draw_marker_handle = null;
MAGMap.prototype.draw_marker = function(lat, lng, draggable, title, listen, callback) {
  var pos = new google.maps.LatLng(lat, lng);
  var markerOption = {
    position : pos,
    map : this.map_handle,
    icon : this.image,
    draggable : draggable,
    title : title
  };
  if(this.draw_marker_handle == null) {
    this.draw_marker_handle = new google.maps.Marker(markerOption);
    google.maps.event.addListener(this.draw_marker_handle, listen, callback);
  } else {
    this.draw_marker_handle.setOptions(markerOption);
  }
  return this.draw_marker_handle;
};

MAGMap.prototype.new_marker_handle = null;
MAGMap.prototype.move_map_center = function(lat_input_id, lng_input_id, store_index, zoom_size) {
  var index;
  this.set_zoom(zoom_size);
  this.set_center($('#'+lat_input_id).val(), $('#'+lng_input_id).val());
  this.draw_circle();

  if(store_index == -1) { // new store
    this.new_marker_handle = this.draw_marker($('#'+lat_input_id).val(), $('#'+lng_input_id).val(), true, 'New Store', 'dragend', function() {
      var new_pos = this.new_marker_handle.getPosition();
      $('#'+lat_input_id).val(this.round(new_pos.lng()));
      $('#'+lng_input_id).val(this.round(new_pos.lat()));
    });
  } else {
    //index = find_index_from_stores(store_index);
    index = store_index;
    this.map_markers[index].setDraggable(true);
    google.maps.event.addListener(this.map_markers[index], 'dragend', function() {
      var new_pos = this.map_markers[index].getPosition();
      $('#'+lat_input_id).val(this.round(new_pos.lng()));
      $('#'+lng_input_id).val(this.round(new_pos.lat()));
    });
  }
};

MAGMap.prototype.update_map_latlng = function(address_input_id, lat_input_id, lng_input_id, location_id) {
  var address = $("#"+address_input_id).val();
  var geocoder = new google.maps.Geocoder();
  var instance = this;
  geocoder.geocode({address: address}, function(results, status) {
    if(status == google.maps.GeocoderStatus.OK) {
      $("#"+lat_input_id).val(instance.round(results[0].geometry.location.lat()));
      $("#"+lng_input_id).val(instance.round(results[0].geometry.location.lng()));
      instance.move_map_center(lat_input_id, lng_input_id, location_id, instance.suitable_zoom(results[0].geometry.location_type));
    }
  });
};

MAGMap.prototype.restore_map_center = function(positions) {
  if(this.draw_circle_handle != null) {
    this.draw_circle_handle.setMap(null);
  }

  if(this.new_marker_handle != null) {
    this.new_marker_handle.setMap(null);
  }

  this.set_zoom(MA_ZOOM_INIT);
  this.set_center(this.centrold(positions, 0), this.centrold(positions, 1));
  for(var i = 0; i < this.map_markers.length; i++) {
    this.map_markers[i].setDraggable(false);
    this.map_markers[i].setPosition(new google.maps.LatLng(positions[i][0], positions[i][1]));
  }
}

MAGMap.prototype.street_view_handle = null;
MAGMap.prototype.show_street_view = function(element_id, lat, lng) {
  var location = new google.maps.LatLng(lat, lng);
  var panoramaOptions = {
    position: location,
    addressControl: false,
    pov: {
      heading: 0,
      pitch: 0,
      zoom: 0
    }
  };
  if(this.street_view_handle == null) {
    this.street_view_handle = new google.maps.StreetViewPanorama(document.getElementById(element_id), panoramaOptions);
  } else {
    this.street_view_handle.setPosition(new google.maps.LatLng(lat, lng));
  }
};

MAGMap.prototype.set_autocomplete = function(element_id) {
  var input =  document.getElementById(element_id);
  var autocomplete = new google.maps.places.Autocomplete(input);
};
