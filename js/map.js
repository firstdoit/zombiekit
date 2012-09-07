(function() {
  var Map, MapFactory, Point;

  window.Map = Map = (function() {

    Map.road = 109;

    function Map(data) {
      this.data = data;
    }

    Map.prototype.layer = function(name) {
      var layer, _ref;
      return (_ref = ((function() {
        var _i, _len, _ref1, _results;
        _ref1 = this.data.layers;
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          layer = _ref1[_i];
          if (layer.name === name) {
            _results.push(layer);
          }
        }
        return _results;
      }).call(this))[0]) != null ? _ref : this.data.layers[0];
    };

    Map.prototype.findPoint = function(coords) {
      var cost, index, type;
      if (coords.x < 1 || coords.y < 1 || coords.x > this.data.width || coords.y > this.layer().data.length / this.layer().width) {
        return void 0;
      }
      index = ((coords.y - 1) * this.data.width + coords.x) - 1;
      type = this.layer('type').data[index];
      cost = this.layer('cost').data[index];
      return new Point(coords.x, coords.y, cost, type);
    };

    return Map;

  })();

  window.Point = Point = (function() {

    function Point(x, y, cost, type) {
      var _ref;
      this.x = x;
      this.y = y;
      this.cost = cost;
      this.type = type;
      this.cost = (_ref = this.cost) != null ? _ref : 1;
      this.visited = false;
    }

    Point.prototype.equals = function(point) {
      return point.x === this.x && point.y === this.y && point.cost === this.cost && point.type === this.type;
    };

    Point.prototype.toString = function() {
      return "(" + this.x + "," + this.y + ")";
    };

    return Point;

  })();

  window.MapFactory = MapFactory = (function() {

    function MapFactory() {}

    MapFactory.getMap = function() {
      var data;
      data = {
        height: 5,
        layers: [
          {
            data: [109, 109, 109, 109, 109, 130, 109, 105, 130, 109, 130, 109, 109, 109, 109, 130, 109, 130, 109, 106, 105, 109, 109, 109, 109],
            height: 5,
            name: "type",
            opacity: 1,
            type: "tilelayer",
            visible: true,
            width: 5,
            x: 0,
            y: 0
          }, {
            data: [4, 4, 4, 4, 4, -1, 4, -1, -1, 4, -1, 4, 4, 4, 4, -1, 4, -1, 4, -1, -1, 4, 4, 4, 4],
            height: 5,
            name: "cost",
            opacity: 1,
            type: "tilelayer",
            visible: true,
            width: 5,
            x: 0,
            y: 0
          }
        ],
        orientation: "orthogonal",
        properties: {},
        tileheight: 64,
        tilesets: [
          {
            firstgid: 1,
            image: "Industrial-TileSheet.png",
            imageheight: 1024,
            imagewidth: 640,
            margin: 0,
            name: "industrial",
            properties: {},
            spacing: 0,
            tileheight: 64,
            tilewidth: 64
          }
        ],
        tilewidth: 64,
        version: 1,
        width: 5
      };
      return new Map(data);
    };

    return MapFactory;

  })();

}).call(this);
