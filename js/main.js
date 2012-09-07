(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    
    require.define = function (filename, fn) {
        if (require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return window.setImmediate;
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/game.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Agent, Game, MapFactory;

  MapFactory = require("./map-factory");

  Agent = require("./agent");

  Game = (function() {

    function Game() {
      this.map = MapFactory.getMap();
      this.agent = new Agent(this.map);
      console.log(this.agent.findBestRoute(this.map.findPoint({
        x: 1,
        y: 1
      }), this.map.findPoint({
        x: 3,
        y: 5
      })));
      console.log(this.agent.findBestRoute(this.map.findPoint({
        x: 1,
        y: 1
      }), this.map.findPoint({
        x: 5,
        y: 2
      })));
      console.log(this.agent.findBestRoute(this.map.findPoint({
        x: 1,
        y: 1
      }), this.map.findPoint({
        x: 4,
        y: 4
      })));
    }

    return Game;

  })();

  module.exports = Game;

}).call(this);

});

require.define("/map-factory.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Map, MapFactory;

  Map = require("./map");

  MapFactory = (function() {

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

  module.exports = MapFactory;

}).call(this);

});

require.define("/map.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Map, Point;

  Point = require("./point");

  Map = (function() {

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

  module.exports = Map;

}).call(this);

});

require.define("/point.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Point;

  Point = (function() {

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

  module.exports = Point;

}).call(this);

});

require.define("/tiled-map-renderer.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var TileMapRenderer;

  TileMapRenderer = (function() {

    function TileMapRenderer() {}

    TileMapRenderer.findCoordsForIndex = function(index, width) {
      return {
        x: ((index - 1) % width) + 1,
        y: Math.ceil(index / width)
      };
    };

    TileMapRenderer.renderMapToContext = function(map, context) {
      var tileset;
      tileset = new Image();
      tileset.onload = function() {
        var coords, dx, dy, point, sx, sy, tileHeight, tileWidth, width, x, y, _i, _results;
        map = window.game.map;
        tileWidth = map.data.tilewidth;
        tileHeight = map.data.tileheight;
        width = map.data.width;
        _results = [];
        for (y = _i = 1; _i <= 5; y = ++_i) {
          _results.push((function() {
            var _j, _results1;
            _results1 = [];
            for (x = _j = 1; _j <= 5; x = ++_j) {
              point = map.findPoint({
                x: x,
                y: y
              });
              coords = TileMapRenderer.findCoordsForIndex(point.type, tileset.naturalWidth / tileWidth);
              sx = (coords.x - 1) * tileWidth;
              sy = (coords.y - 1) * tileHeight;
              dx = (x - 1) * tileWidth;
              dy = (y - 1) * tileHeight;
              _results1.push(context.drawImage(tileset, sx, sy, tileWidth, tileHeight, dx, dy, tileWidth, tileHeight));
            }
            return _results1;
          })());
        }
        return _results;
      };
      tileset.src = 'img/' + map.data.tilesets[0].image;
    };

    return TileMapRenderer;

  })();

  module.exports = TileMapRenderer;

}).call(this);

});

require.define("/agent.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Agent, Map;

  Map = require("./map");

  Agent = (function() {

    function Agent(map) {
      this.map = map;
      this.position = {
        x: 1,
        y: 1
      };
    }

    Agent.prototype.nonCollidablePointsFromPoint = function(point) {
      var down, left, ncpoint, nonCollidablePoints, right, up, _i, _len, _ref;
      up = this.map.findPoint({
        x: point.x,
        y: point.y - 1
      });
      right = this.map.findPoint({
        x: point.x + 1,
        y: point.y
      });
      down = this.map.findPoint({
        x: point.x,
        y: point.y + 1
      });
      left = this.map.findPoint({
        x: point.x - 1,
        y: point.y
      });
      nonCollidablePoints = [];
      _ref = [up, right, down, left];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ncpoint = _ref[_i];
        if ((ncpoint != null ? ncpoint.type : void 0) === Map.road) {
          nonCollidablePoints.push(ncpoint);
        }
      }
      return nonCollidablePoints;
    };

    Agent.prototype.findBestRoute = function(originPoint, goalPoint) {
      var bestPoint, bestPointHeuristicValue, bestRoute, currentPoint, point, pointHeuristicValue, treeCurrentNode, treeHead, unvisitedPoints, _i, _j, _len, _len1, _ref, _ref1, _ref2;
      currentPoint = originPoint;
      currentPoint.visited = true;
      treeHead = treeCurrentNode = new Arboreal(null, currentPoint);
      bestRoute = [];
      while (!currentPoint.equals(goalPoint)) {
        _ref = this.nonCollidablePointsFromPoint(currentPoint);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          point = _ref[_i];
          if ((_ref1 = treeCurrentNode.parent) != null ? _ref1.data.equals(point) : void 0) {
            point.visited = true;
          }
          treeCurrentNode.appendChild(point);
        }
        unvisitedPoints = [];
        treeHead.traverseDown(function(node) {
          if (!node.data.visited) {
            return unvisitedPoints.push(node.data);
          }
        });
        bestPoint = unvisitedPoints[0];
        bestPointHeuristicValue = this.heuristicValue(bestPoint, goalPoint, treeHead);
        _ref2 = unvisitedPoints.slice(1);
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          point = _ref2[_j];
          pointHeuristicValue = this.heuristicValue(point, goalPoint, treeHead);
          if (pointHeuristicValue < bestPointHeuristicValue) {
            bestPoint = point;
            bestPointHeuristicValue = pointHeuristicValue;
          }
        }
        currentPoint = bestPoint;
        currentPoint.visited = true;
        treeCurrentNode = treeHead.find(function(node) {
          return node.data === currentPoint;
        });
      }
      while (treeCurrentNode) {
        bestRoute.push(treeCurrentNode != null ? treeCurrentNode.data.toString() : void 0);
        treeCurrentNode = treeCurrentNode.parent;
      }
      return bestRoute.reverse();
    };

    Agent.prototype.heuristicValue = function(point, goalPoint, treeHead) {
      return this.distanceToPoint(point, goalPoint) + this.pathCost(point, treeHead);
    };

    Agent.prototype.distanceToPoint = function(pointA, pointB) {
      return Math.abs(pointA.x - pointB.x) + Math.abs(pointA.y - pointB.y);
    };

    Agent.prototype.pathCost = function(point, treeHead) {
      var cost, treeB;
      cost = 0;
      treeB = treeHead.find(function(node) {
        return node.data === point;
      });
      while (treeB) {
        cost += treeB.data.cost;
        treeB = treeB.parent;
      }
      return cost;
    };

    return Agent;

  })();

  module.exports = Agent;

}).call(this);

});

require.define("/main.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Game, TiledMapRenderer;

  Game = require("./game");

  TiledMapRenderer = require("./tiled-map-renderer");

  Zepto(function($) {
    var canvas, ctx, stage;
    window.game = new Game();
    canvas = $('#canvas')[0];
    ctx = canvas.getContext("2d");
    stage = new createjs.Stage(canvas);
    return TiledMapRenderer.renderMapToContext(window.game.map, ctx);
  });

}).call(this);

});
require("/main.coffee");
})();
