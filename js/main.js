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

require.define("/projects/zombiekit/coffee/map-factory.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Map, MapFactory;

  Map = require("./map");

  MapFactory = (function() {

    function MapFactory() {}

    MapFactory.getMap = function() {
      var data;
      data = {
        height: 20,
        layers: [
          {
            data: [1, 1, 3, 1, 1, 1, 5, 1, 1, 1, 5, 1, 1, 3, 1, 1, 2, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 2, 0, 0, 1, 0, 0, 0, 4, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 2, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 1, 1, 5, 1, 1, 1, 3, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 5, 1, 1, 1, 1, 4, 1, 1, 3, 1, 1, 1, 1, 0, 0, 5, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 3, 1, 1, 1, 3, 1, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 5, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 5, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 2, 1, 5, 1, 1, 1, 1, 1, 3, 1, 2, 1, 0, 0, 4, 1, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0, 4, 0, 0, 1, 5, 0, 0, 1, 0, 0, 0, 0, 3, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 4, 1, 0, 0, 1, 1, 4, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 0, 0, 1, 5, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 3, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 5, 0, 0, 1, 1, 0, 0, 1, 0, 0, 3, 0, 0, 0, 2, 0, 0, 4, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 5, 2, 1, 1, 1, 5, 1, 1, 3, 1, 2, 1, 1, 3, 1, 1, 1, 1, 2, 1, 1],
            height: 20,
            name: "cost",
            opacity: 1,
            type: "tilelayer",
            visible: true,
            width: 20,
            x: 0,
            y: 0
          }, {
            data: [502, 496, 496, 502, 496, 496, 496, 502, 496, 496, 496, 502, 496, 496, 502, 496, 496, 496, 496, 502, 497, 522, 522, 497, 522, 522, 522, 497, 522, 522, 522, 497, 522, 522, 497, 522, 522, 522, 522, 497, 497, 522, 445, 497, 522, 522, 522, 497, 522, 522, 522, 497, 522, 522, 497, 522, 522, 522, 522, 497, 497, 522, 522, 497, 522, 522, 508, 502, 496, 496, 496, 502, 522, 522, 497, 522, 522, 522, 522, 497, 497, 522, 522, 497, 522, 522, 522, 497, 522, 522, 522, 497, 522, 522, 502, 496, 496, 496, 496, 502, 497, 522, 522, 497, 522, 522, 522, 497, 522, 522, 522, 497, 522, 522, 497, 522, 522, 188, 522, 497, 502, 496, 496, 502, 496, 496, 496, 496, 496, 496, 496, 497, 522, 522, 497, 522, 522, 522, 522, 497, 497, 522, 522, 497, 522, 522, 497, 522, 522, 522, 522, 497, 496, 496, 496, 496, 496, 496, 496, 502, 497, 522, 522, 497, 522, 522, 497, 522, 522, 522, 522, 497, 522, 522, 522, 522, 497, 522, 522, 497, 497, 522, 522, 497, 522, 522, 497, 522, 522, 522, 522, 497, 522, 522, 522, 522, 497, 522, 522, 497, 502, 496, 496, 502, 496, 496, 496, 496, 496, 496, 496, 502, 496, 496, 496, 496, 502, 522, 522, 497, 497, 522, 522, 497, 522, 522, 522, 522, 522, 522, 522, 497, 522, 522, 522, 522, 497, 522, 522, 497, 497, 522, 522, 497, 522, 522, 522, 522, 522, 522, 522, 497, 522, 522, 522, 522, 497, 522, 522, 497, 497, 522, 522, 497, 522, 522, 522, 522, 522, 522, 522, 497, 522, 522, 522, 522, 497, 496, 496, 502, 497, 522, 522, 502, 496, 496, 502, 496, 496, 496, 496, 496, 496, 502, 496, 496, 497, 522, 522, 497, 497, 522, 522, 497, 522, 522, 497, 522, 522, 522, 497, 522, 522, 497, 522, 522, 497, 522, 522, 497, 502, 496, 496, 502, 522, 522, 497, 442, 522, 522, 497, 522, 522, 497, 522, 522, 497, 522, 443, 497, 497, 522, 522, 497, 522, 522, 497, 522, 522, 522, 497, 522, 522, 497, 522, 522, 497, 522, 522, 497, 497, 522, 522, 497, 522, 522, 497, 522, 522, 522, 497, 522, 522, 497, 522, 522, 497, 522, 522, 497, 502, 496, 496, 502, 496, 496, 502, 496, 496, 496, 502, 496, 496, 502, 496, 496, 502, 496, 496, 502],
            height: 20,
            name: "graphic",
            opacity: 1,
            type: "tilelayer",
            visible: true,
            width: 20,
            x: 0,
            y: 0
          }
        ],
        orientation: "orthogonal",
        properties: {},
        tileheight: 32,
        tilesets: [
          {
            firstgid: 1,
            image: "free_tileset_version_10.png",
            imageheight: 1216,
            imagewidth: 480,
            margin: 0,
            name: "SilveiraNeto",
            spacing: 0,
            tileheight: 32,
            tileproperties: {
              187: {
                type: "food",
                collidable: "0"
              },
              441: {
                type: "water",
                collidable: "0"
              },
              442: {
                type: "guns",
                collidable: "0"
              },
              444: {
                type: "home",
                collidable: "0"
              },
              495: {
                collidable: "0"
              },
              496: {
                collidable: "0"
              },
              501: {
                collidable: "0"
              },
              507: {
                type: "ammo",
                collidable: "0"
              }
            },
            tilewidth: 32
          }
        ],
        tilewidth: 32,
        version: 1,
        width: 20
      };
      return new Map(data);
    };

    return MapFactory;

  })();

  module.exports = MapFactory;

}).call(this);

});

require.define("/projects/zombiekit/coffee/map.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Map, Point,
    __slice = [].slice;

  Point = require("./point");

  Map = (function() {

    Map.costsInMin = {
      1: 3,
      2: 8,
      3: 14,
      4: 20,
      5: 30
    };

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

    Map.prototype.getTypeProperty = function(type) {
      var _ref;
      return (_ref = this.data.tilesets[0].tileproperties[type - 1]) != null ? _ref['type'] : void 0;
    };

    Map.prototype.getCollidableProperty = function(index) {
      var collidable, _ref;
      collidable = (_ref = this.data.tilesets[0].tileproperties[index - 1]) != null ? _ref['collidable'] : void 0;
      if (collidable && collidable === "0") {
        return false;
      } else {
        return true;
      }
    };

    Map.prototype.getCostForIndex = function(index) {
      var _ref;
      return (_ref = Map.costsInMin[this.layer('cost').data[index]]) != null ? _ref : 0;
    };

    Map.prototype.findPoint = function() {
      var args, collidable, coords, cost, index, tileIndex, type;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (args.length === 1) {
        coords = args[0];
      } else {
        coords = {
          x: args[0],
          y: args[1]
        };
      }
      if (coords.x < 1 || coords.y < 1 || coords.x > this.data.width || coords.y > this.layer().data.length / this.layer().width) {
        return void 0;
      }
      index = ((coords.y - 1) * this.data.width + coords.x) - 1;
      tileIndex = this.layer('graphic').data[index];
      cost = this.getCostForIndex(index);
      type = this.getTypeProperty(tileIndex);
      collidable = this.getCollidableProperty(tileIndex);
      return new Point(coords.x, coords.y, cost, type, collidable, tileIndex);
    };

    return Map;

  })();

  module.exports = Map;

}).call(this);

});

require.define("/projects/zombiekit/coffee/point.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Point;

  Point = (function() {

    function Point(x, y, cost, type, collidable, tileIndex) {
      var _ref;
      this.x = x;
      this.y = y;
      this.cost = cost;
      this.type = type;
      this.collidable = collidable;
      this.tileIndex = tileIndex;
      this.cost = (_ref = this.cost) != null ? _ref : 1;
      this.visited = false;
      this.pathIndex = void 0;
    }

    Point.prototype.equals = function(point) {
      var result;
      result = (point.x === this.x) && (point.y === this.y);
      return result;
    };

    Point.prototype.toString = function() {
      return "(" + this.x + "," + this.y + ")";
    };

    return Point;

  })();

  module.exports = Point;

}).call(this);

});

require.define("/projects/zombiekit/lib/arboreal.js",function(require,module,exports,__dirname,__filename,process){!function () {
  function include (array, item) {
    return array.indexOf(item) > -1;
  }

  function _traverseDown (context, iterator) {
    var doContinue = true;
  
    (function walkDown (node) {
      var i, newContext;
  
      if (!doContinue) return;
  
      if (iterator(node) === false) {
        //break the traversal loop if the iterator returns a falsy value
        doContinue = false;
      }
      else {
        for (i = 0; i < node.children.length; i++) {
          newContext = node.children[i];
          walkDown(newContext);
        }
      }
    })(context);
  }


  function _traverseUp (context, iterator) {
    var i, node, doContinue;

    while (context) {
      if ( iterator(context) === false ) return;

      for (i = 0; i < context.children.length; i++) {
        node = context.children[i];
        if ( iterator(node) === false ) return;
      }
      context = context.parent;
    }
  }
  
  
  function _traverse (context, iterator, callback) {
    var visited = [],
        callIterator = function (node) {
          var id = node.id,
              returned;
  
          if (! include(visited, id)) {
            returned = iterator.call(node, node);
            visited.push(id);
  
            if (returned === false) {
              return returned;
            }
          }
        },
        i, node;
  
    callback(context, callIterator);
  }
  

  function _removeChild (node) {
    var parent = node.parent, 
        child,
        i;
  
    for (i = 0; i < parent.children.length; i++) {
      child = parent.children[i];
  
      if (child === node) {
        return parent.children.splice(i, 1).shift();
      }
    }
  }
  
  function nodeId (parent, separator) {
    separator = separator || '/';
    if (parent) {
      return [parent.id, parent.children.length ].join(separator);
    }
    else {
      return '0';
    }
  }
  
  
  function Arboreal (parent, data, id) {
    this.depth = parent ? parent.depth + 1 : 0;
    this.data = data || {};
    this.parent = parent || null;
    this.id = id || nodeId(parent);
    this.children = [];
  }
  
  Arboreal.parse = function (object, childrenAttr) {
    var root, getNodeData = function (node) {
          var attr, nodeData = {};
          for (attr in node) {
            if (attr !== childrenAttr) nodeData[attr] = node[attr];
          }
          return nodeData;
        };
  
    (function walkDown(node, parent) {
      var newNode, i;
  
      if (!parent) {
        newNode = root = new Arboreal(null, getNodeData(node));
      } else {
        newNode = new Arboreal(parent, getNodeData(node));
        parent.children.push(newNode);
      }
      if (childrenAttr in node) {
        for (i = 0; i < node[childrenAttr].length; i++ ) {
          walkDown(node[childrenAttr][i], newNode);
        }
      }
    })(object);
  
    return root;
  
  };
  
  Arboreal.prototype.appendChild = function (data, id) {
    var child = new Arboreal(this, data, id);
    this.children.push(child);
    return this;
  };
  
  Arboreal.prototype.removeChild = function (arg) {
    if (typeof arg === 'number' && this.children[arg]) {
      return this.children.splice(arg, 1).shift();
    }
    if (arg instanceof Arboreal) {
      return _removeChild(arg);
    }
    throw new Error("Invalid argument "+ arg);
  };
  
  Arboreal.prototype.remove = function () {
    return _removeChild(this);
  };
  
  
  Arboreal.prototype.root = function () {
    var node = this;
  
    if (!node.parent) {
      return this;
    }
  
    while (node.parent) {
      node = node.parent;
    }
    return node;
  };
  
  Arboreal.prototype.isRoot = function () {
    return !this.parent;
  };
  
  Arboreal.prototype.traverseUp = function (iterator) {
    _traverse(this, iterator, _traverseUp);
  };
  
  Arboreal.prototype.traverseDown = function (iterator) {
    _traverse(this, iterator, _traverseDown);
  };
  
  Arboreal.prototype.toString = function () {
    var lines = [];
  
    this.traverseDown(function (node) {
      var separator = '|- ', indentation = '',  i;
  
      if (node.depth === 0) {
        lines.push(node.id);
        return;
      }
      for (i = 0; i < node.depth; i++) {
        indentation += ' ';
      }
      lines.push( indentation + separator + node.id);
    });
    return lines.join("\n");
  };
  
  Arboreal.prototype.find = function (finder) {
    var match = null,
        iterator = (typeof finder === 'function') ?
          finder : function (node) {
            if (node.id === finder) {
              match = node;
              return false;
            }
          };
  
    this.traverseDown(function (node) {
      if (iterator.call(this, node)) {
        match = node;
        return false;
      }
    });
  
    return match;
  };
  
  Arboreal.prototype.path = function (path, separator) {
    separator = separator || '/';
    //allow path to begin with 
    if (path[0] === separator) path = path.substring(1);
  
    var indexes = path.split(separator),
        index = null,
        context = this,
        i;
  
    for (i = 0; i < indexes.length; i++) {
      index = parseInt(indexes[i], 10);
      context = (context.children.length && context.children.length > index) ? 
        context.children[index] : null;
    }
  
    return context;
  };
  
  Arboreal.prototype.toArray = function () {
    var nodeList = [];
    this.traverseDown(function (node) {
      nodeList.push(node);
    });
    return nodeList;
  };

  Arboreal.prototype.__defineGetter__("length", function () {
    return this.toArray().length;
  });


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Arboreal;
  } else {
    this.Arboreal = Arboreal;
  }

}(this);

});

require.define("/projects/zombiekit/coffee/path.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Path, Point;

  Point = require("./point");

  Path = (function() {

    function Path(points) {
      this.points = [].concat(points);
      this.resetIndexes();
    }

    Path.prototype.resetIndexes = function() {
      var i, point, _i, _len, _ref, _results;
      _ref = this.points;
      _results = [];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        point = _ref[i];
        _results.push(point.pathIndex = i);
      }
      return _results;
    };

    Path.prototype.cost = function() {
      var point, sum, _i, _len, _ref;
      sum = 0;
      _ref = this.points;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        point = _ref[_i];
        sum = sum + point.cost;
      }
      return sum;
    };

    Path.prototype.toString = function() {
      var point, string, _i, _len, _ref;
      string = "";
      _ref = this.points;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        point = _ref[_i];
        string = string + point.toString() + " ";
      }
      return string;
    };

    Path.prototype.key = function() {
      var firstPoint, lastPoint;
      firstPoint = this.points[0];
      lastPoint = this.points[this.points.length - 1];
      return firstPoint.toString() + lastPoint.toString();
    };

    Path.prototype.nextPoint = function(point) {
      var _ref;
      return (_ref = this.points[point.pathIndex + 1]) != null ? _ref : point;
    };

    Path.prototype.reverse = function() {
      this.points = this.points.reverse();
      return this;
    };

    Path.prototype.addPath = function(path) {
      var lastPoint;
      lastPoint = this.points[this.points.length - 1];
      if (lastPoint && !lastPoint.equals(path.points[0])) {
        return;
      }
      this.points = this.points.concat(path.points.slice(1));
      return this.resetIndexes();
    };

    Path.prototype.cost = function() {
      var point, sum, _i, _len, _ref;
      sum = 0;
      _ref = this.points;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        point = _ref[_i];
        sum += point.cost;
      }
      return sum;
    };

    Path.keyFromPoints = function(twoPoints) {
      return new Path(twoPoints).key();
    };

    return Path;

  })();

  module.exports = Path;

}).call(this);

});

require.define("/projects/zombiekit/coffee/tiled-map-renderer.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Q, TileMapRenderer;

  Q = require("q");

  TileMapRenderer = (function() {

    function TileMapRenderer() {}

    TileMapRenderer.findCoordsForIndex = function(index, width) {
      return {
        x: ((index - 1) % width) + 1,
        y: Math.ceil(index / width)
      };
    };

    TileMapRenderer.renderMapToContext = function(map, context) {
      var deferred, tileset;
      tileset = new Image();
      deferred = Q.defer();
      tileset.onload = function() {
        var coords, dx, dy, height, point, sx, sy, tileHeight, tileWidth, width, x, y, _i, _j;
        tileWidth = map.data.tilewidth;
        tileHeight = map.data.tileheight;
        width = map.data.width;
        height = map.data.height;
        for (y = _i = 1; 1 <= width ? _i <= width : _i >= width; y = 1 <= width ? ++_i : --_i) {
          for (x = _j = 1; 1 <= height ? _j <= height : _j >= height; x = 1 <= height ? ++_j : --_j) {
            point = map.findPoint({
              x: x,
              y: y
            });
            coords = TileMapRenderer.findCoordsForIndex(point.tileIndex, tileset.naturalWidth / tileWidth);
            sx = (coords.x - 1) * tileWidth;
            sy = (coords.y - 1) * tileHeight;
            dx = (x - 1) * tileWidth;
            dy = (y - 1) * tileHeight;
            context.drawImage(tileset, sx, sy, tileWidth, tileHeight, dx, dy, tileWidth, tileHeight);
          }
        }
        return deferred.resolve(context);
      };
      tileset.src = 'img/' + map.data.tilesets[0].image;
      return deferred.promise;
    };

    return TileMapRenderer;

  })();

  module.exports = TileMapRenderer;

}).call(this);

});

require.define("/node_modules/q/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"q.js"}
});

require.define("/node_modules/q/q.js",function(require,module,exports,__dirname,__filename,process){// vim:ts=4:sts=4:sw=4:
/*jshint browser: true, node: true,
  curly: true, eqeqeq: true, noarg: true, nonew: true, trailing: true,
  undef: true */
/*global define: false, Q: true, msSetImmediate: false, setImmediate: false,
  ReturnValue: false, cajaVM: false, ses: false */
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * With formatStackTrace and formatSourcePosition functions
 * Copyright 2006-2008 the V8 project authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 *       copyright notice, this list of conditions and the following
 *       disclaimer in the documentation and/or other materials provided
 *       with the distribution.
 *     * Neither the name of Google Inc. nor the names of its
 *       contributors may be used to endorse or promote products derived
 *       from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /*jshint strict: false*/

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        definition(void 0, exports);

    // RequireJS
    } else if (typeof define === "function") {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = function () {
                var Q = {};
                return definition(void 0, Q);
            };
        }

    // <script>
    } else {
        definition(void 0, Q = {});
    }

})(function (require, exports) {
"use strict";

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback "defend" and in "allResolved"
var noop = function () {};

// for the security conscious, defend may be a deep freeze as provided
// by cajaVM.  Otherwise we try to provide a shallow freeze just to
// discourage promise changes that are not compatible with secure
// usage.  If Object.freeze does not exist, fall back to doing nothing
// (no op).
var defend = Object.freeze || noop;
if (typeof cajaVM !== "undefined") {
    defend = cajaVM.def;
}

// use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick;
if (typeof process !== "undefined") {
    // node
    nextTick = process.nextTick;
} else if (typeof msSetImmediate === "function") {
    // IE 10 only, at the moment
    // And yes, ``bind``ing to ``window`` is necessary O_o.
    nextTick = msSetImmediate.bind(window);
} else if (typeof setImmediate === "function") {
    // https://github.com/NobleJS/setImmediate
    nextTick = setImmediate;
} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    // linked list of tasks (single, with head node)
    var head = {}, tail = head;
    channel.port1.onmessage = function () {
        head = head.next;
        var task = head.task;
        delete head.task;
        task();
    };
    nextTick = function (task) {
        tail = tail.next = {task: task};
        channel.port2.postMessage(0);
    };
} else {
    // old browsers
    nextTick = function (task) {
        setTimeout(task, 0);
    };
}

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this does have the nice side-effect of reducing the size
// of the code by reducing x.call() to merely x(), eliminating many
// hard-to-minify characters.
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var uncurryThis;
// I have kept both variations because the first is theoretically
// faster, if bind is available.
if (Function.prototype.bind) {
    var Function_bind = Function.prototype.bind;
    uncurryThis = Function_bind.bind(Function_bind.call);
} else {
    uncurryThis = function (f) {
        return function () {
            return f.call.apply(f, arguments);
        };
    };
}

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        keys.push(key);
    }
    return keys;
};

var object_toString = Object.prototype.toString;

// generator related shims

function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

function formatStackTrace(error, frames) {
    var lines = [];
    try {
        lines.push(error.toString());
    } catch (e) {
        try {
            lines.push("<error: " + e + ">");
        } catch (ee) {
            lines.push("<error>");
        }
    }
    for (var i = 0; i < frames.length; i++) {
        var frame = frames[i];
        var line;

        // <Inserted by @domenic>
        if (typeof frame === "string") {
            lines.push(frame);
        // </Inserted by @domenic>
        } else {
            try {
                line = formatSourcePosition(frame);
            } catch (e) {
                try {
                    line = "<error: " + e + ">";
                } catch (ee) {
                    // Any code that reaches this point is seriously nasty!
                    line = "<error>";
                }
            }
            lines.push("    at " + line);
        }
    }
    return lines.join("\n");
}

function formatSourcePosition(frame) {
    var fileLocation = "";
    if (frame.isNative()) {
        fileLocation = "native";
    } else if (frame.isEval()) {
        fileLocation = "eval at " + frame.getEvalOrigin();
    } else {
        var fileName = frame.getFileName();
        if (fileName) {
            fileLocation += fileName;
            var lineNumber = frame.getLineNumber();
            if (lineNumber !== null) {
                fileLocation += ":" + lineNumber;
                var columnNumber = frame.getColumnNumber();
                if (columnNumber) {
                    fileLocation += ":" + columnNumber;
                }
            }
        }
    }
    if (!fileLocation) {
        fileLocation = "unknown source";
    }
    var line = "";
    var functionName = frame.getFunction().name;
    var addPrefix = true;
    var isConstructor = frame.isConstructor();
    var isMethodCall = !(frame.isToplevel() || isConstructor);
    if (isMethodCall) {
        var methodName = frame.getMethodName();
        line += frame.getTypeName() + ".";
        if (functionName) {
            line += functionName;
            if (methodName && (methodName !== functionName)) {
                line += " [as " + methodName + "]";
            }
        } else {
            line += methodName || "<anonymous>";
        }
    } else if (isConstructor) {
        line += "new " + (functionName || "<anonymous>");
    } else if (functionName) {
        line += functionName;
    } else {
        line += fileLocation;
        addPrefix = false;
    }
    if (addPrefix) {
        line += " (" + fileLocation + ")";
    }
    return line;
}

function isInternalFrame(fileName, frame) {
    if (fileName !== qFileName) {
        return false;
    }
    var line = frame.getLineNumber();
    return line >= qStartingLine && line <= qEndingLine;
}

/*
 * Retrieves an array of structured stack frames parsed from the ``stack``
 * property of a given object.
 *
 * @param objectWithStack {Object} an object with a ``stack`` property: usually
 * an error or promise.
 *
 * @returns an array of stack frame objects. For more information, see
 * [V8's JavaScript stack trace API documentation](http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi).
 */
function getStackFrames(objectWithStack) {
    var oldPrepareStackTrace = Error.prepareStackTrace;

    Error.prepareStackTrace = function (error, frames) {
        // Filter out frames from the innards of Node and Q.
        return frames.filter(function (frame) {
            var fileName = frame.getFileName();
            return (
                fileName !== "module.js" &&
                fileName !== "node.js" &&
                !isInternalFrame(fileName, frame)
            );
        });
    };

    var stack = objectWithStack.stack;

    Error.prepareStackTrace = oldPrepareStackTrace;

    return stack;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (Error.captureStackTrace) {
        var fileName, lineNumber;

        var oldPrepareStackTrace = Error.prepareStackTrace;

        Error.prepareStackTrace = function (error, frames) {
            fileName = frames[1].getFileName();
            lineNumber = frames[1].getLineNumber();
        };

        // teases call of temporary prepareStackTrace
        // JSHint and Closure Compiler generate known warnings here
        /*jshint expr: true */
        new Error().stack;

        Error.prepareStackTrace = oldPrepareStackTrace;
        qFileName = fileName;
        return lineNumber;
    }
}

function deprecate(fn, name, alternative) {
    return function () {
        if (typeof console !== "undefined" && typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative + " instead.", new Error("").stack);
        }
        return fn.apply(fn, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
exports.nextTick = nextTick;

/**
 * Constructs a {promise, resolve} object.
 *
 * The resolver is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke the resolver with any value that is
 * not a function. To reject the promise, invoke the resolver with a rejection
 * object. To put the promise in the same state as another promise, invoke the
 * resolver with that other promise.
 */
exports.defer = defer;
function defer() {
    // if "pending" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the pending array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the ref promise because it handles both fully
    // resolved values and other promises gracefully.
    var pending = [], value;

    var deferred = object_create(defer.prototype);
    var promise = object_create(makePromise.prototype);

    promise.promiseSend = function () {
        var args = array_slice(arguments);
        if (pending) {
            pending.push(args);
        } else {
            nextTick(function () {
                value.promiseSend.apply(value, args);
            });
        }
    };

    promise.valueOf = function () {
        if (pending) {
            return promise;
        }
        return value.valueOf();
    };

    if (Error.captureStackTrace) {
        Error.captureStackTrace(promise, defer);
    }

    function become(resolvedValue) {
        if (!pending) {
            return;
        }
        value = resolve(resolvedValue);
        array_reduce(pending, function (undefined, pending) {
            nextTick(function () {
                value.promiseSend.apply(value, pending);
            });
        }, void 0);
        pending = void 0;
        return value;
    }

    defend(promise);

    deferred.promise = promise;
    deferred.resolve = become;
    deferred.reject = function (exception) {
        return become(reject(exception));
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};
// XXX deprecated
defer.prototype.node = deprecate(defer.prototype.makeNodeResolver, "node", "makeNodeResolver");

/**
 * @param makePromise {Function} a function that returns nothing and accepts
 * the resolve and reject functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in makePromise
 */
exports.promise = promise;
function promise(makePromise) {
    var deferred = defer();
    fcall(
        makePromise,
        deferred.resolve,
        deferred.reject
    ).fail(deferred.reject);
    return deferred.promise;
}

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * put(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
exports.makePromise = makePromise;
function makePromise(descriptor, fallback, valueOf, exception) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error("Promise does not support operation: " + op));
        };
    }

    var promise = object_create(makePromise.prototype);

    promise.promiseSend = function (op, resolved /* ...args */) {
        var args = array_slice(arguments, 2);
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.apply(promise, [op].concat(args));
            }
        } catch (exception) {
            result = reject(exception);
        }
        resolved(result);
    };

    if (valueOf) {
        promise.valueOf = valueOf;
    }

    if (exception) {
        promise.exception = exception;
    }

    defend(promise);

    return promise;
}

// provide thenables, CommonJS/Promises/A
makePromise.prototype.then = function (fulfilled, rejected) {
    return when(this, fulfilled, rejected);
};

// Chainable methods
array_reduce(
    [
        "isResolved", "isFulfilled", "isRejected",
        "when", "spread", "send",
        "get", "put", "del",
        "post", "invoke",
        "keys",
        "apply", "call", "bind",
        "fapply", "fcall", "fbind",
        "all", "allResolved",
        "view", "viewInfo",
        "timeout", "delay",
        "catch", "finally", "fail", "fin", "end"
    ],
    function (undefined, name) {
        makePromise.prototype[name] = function () {
            return exports[name].apply(
                exports,
                [this].concat(array_slice(arguments))
            );
        };
    },
    void 0
);

makePromise.prototype.toSource = function () {
    return this.toString();
};

makePromise.prototype.toString = function () {
    return "[object Promise]";
};

defend(makePromise.prototype);

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */
exports.nearer = valueOf;
function valueOf(value) {
    // if !Object.isObject(value)
    // generates a known JSHint "constructor invocation without new" warning
    // supposed to be fixed, but isn't? https://github.com/jshint/jshint/issues/392
    /*jshint newcap: false */
    if (Object(value) !== value) {
        return value;
    } else {
        return value.valueOf();
    }
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
exports.isPromise = isPromise;
function isPromise(object) {
    return object && typeof object.promiseSend === "function";
}

/**
 * @returns whether the given object is a resolved promise.
 */
exports.isResolved = isResolved;
function isResolved(object) {
    return isFulfilled(object) || isRejected(object);
}

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
exports.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(valueOf(object));
}

/**
 * @returns whether the given object is a rejected promise.
 */
exports.isRejected = isRejected;
function isRejected(object) {
    object = valueOf(object);
    return isPromise(object) && 'exception' in object;
}

var rejections = [];
var errors = [];
var errorsDisplayed;
function displayErrors() {
    if (
        !errorsDisplayed &&
        typeof window !== "undefined" &&
        !window.Touch &&
        window.console
    ) {
        // This promise library consumes exceptions thrown in handlers so
        // they can be handled by a subsequent promise.  The rejected
        // promises get added to this array when they are created, and
        // removed when they are handled.
        console.log("Should be empty:", errors);
    }
    errorsDisplayed = true;
}

/**
 * Constructs a rejected promise.
 * @param exception value describing the failure
 */
exports.reject = reject;
function reject(exception) {
    exception = exception || new Error();
    var rejection = makePromise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                var at = array_indexOf(rejections, this);
                if (at !== -1) {
                    errors.splice(at, 1);
                    rejections.splice(at, 1);
                }
            }
            return rejected ? rejected(exception) : reject(exception);
        }
    }, function fallback() {
        return reject(exception);
    }, function valueOf() {
        return this;
    }, exception);
    // note that the error has not been handled
    displayErrors();
    rejections.push(rejection);
    errors.push(exception);
    return rejection;
}

/**
 * Constructs a promise for an immediate reference.
 * @param value immediate reference
 */
exports.begin = resolve; // XXX experimental
exports.resolve = resolve;
exports.ref = deprecate(resolve, "ref", "resolve"); // XXX deprecated, use resolve
function resolve(object) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(object)) {
        return object;
    }
    // assimilate thenables, CommonJS/Promises/A
    if (object && typeof object.then === "function") {
        var result = defer();
        object.then(result.resolve, result.reject);
        return result.promise;
    }
    return makePromise({
        "when": function () {
            return object;
        },
        "get": function (name) {
            return object[name];
        },
        "put": function (name, value) {
            return object[name] = value;
        },
        "del": function (name) {
            return delete object[name];
        },
        "post": function (name, value) {
            return object[name].apply(object, value);
        },
        "apply": function (self, args) {
            return object.apply(self, args);
        },
        "fapply": function (args) {
            return object.apply(void 0, args);
        },
        "viewInfo": function () {
            var on = object;
            var properties = {};

            function fixFalsyProperty(name) {
                if (!properties[name]) {
                    properties[name] = typeof on[name];
                }
            }

            while (on) {
                Object.getOwnPropertyNames(on).forEach(fixFalsyProperty);
                on = Object.getPrototypeOf(on);
            }
            return {
                "type": typeof object,
                "properties": properties
            };
        },
        "keys": function () {
            return object_keys(object);
        }
    }, void 0, function valueOf() {
        return object;
    });
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
exports.master = master;
function master(object) {
    return makePromise({
        "isDef": function () {}
    }, function fallback() {
        var args = array_slice(arguments);
        return send.apply(void 0, [object].concat(args));
    }, function () {
        return valueOf(object);
    });
}

exports.viewInfo = viewInfo;
function viewInfo(object, info) {
    object = resolve(object);
    if (info) {
        return makePromise({
            "viewInfo": function () {
                return info;
            }
        }, function fallback() {
            var args = array_slice(arguments);
            return send.apply(void 0, [object].concat(args));
        }, function () {
            return valueOf(object);
        });
    } else {
        return send(object, "viewInfo");
    }
}

exports.view = view;
function view(object) {
    return viewInfo(object).when(function (info) {
        var view;
        if (info.type === "function") {
            view = function () {
                return apply(object, void 0, arguments);
            };
        } else {
            view = {};
        }
        var properties = info.properties || {};
        object_keys(properties).forEach(function (name) {
            if (properties[name] === "function") {
                view[name] = function () {
                    return post(object, name, arguments);
                };
            }
        });
        return resolve(view);
    });
}

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value     promise or immediate reference to observe
 * @param fulfilled function to be called with the fulfilled value
 * @param rejected  function to be called with the rejection exception
 * @return promise for the return value from the invoked callback
 */
exports.when = when;
function when(value, fulfilled, rejected) {
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return fulfilled ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        try {
            return rejected ? rejected(exception) : reject(exception);
        } catch (newException) {
            return reject(newException);
        }
    }

    nextTick(function () {
        resolve(value).promiseSend("when", function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        });
    });

    return deferred.promise;
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
exports.spread = spread;
function spread(promise, fulfilled, rejected) {
    return when(promise, function (valuesOrPromises) {
        return all(valuesOrPromises).then(function (values) {
            return fulfilled.apply(void 0, values);
        });
    }, rejected);
}

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  This presently only works in
 * Firefox/Spidermonkey, however, this code does not cause syntax
 * errors in older engines.  This code should continue to work and
 * will in fact improve over time as the language improves.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 *  - in present implementations of generators, when a generator
 *    function is complete, it throws ``StopIteration``, ``return`` is
 *    a syntax error in the presence of ``yield``, so there is no
 *    observable return value. There is a proposal[1] to add support
 *    for ``return``, which would permit the value to be carried by a
 *    ``StopIteration`` instance, in which case it would fulfill the
 *    promise returned by the asynchronous generator.  This can be
 *    emulated today by throwing StopIteration explicitly with a value
 *    property.
 *
 *  [1]: http://wiki.ecmascript.org/doku.php?id=strawman:async_functions#reference_implementation
 *
 */
exports.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;
            try {
                result = generator[verb](arg);
            } catch (exception) {
                if (isStopIteration(exception)) {
                    return exception.value;
                } else {
                    return reject(exception);
                }
            }
            return when(result, callback, errback);
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "send");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 * Only useful presently in Firefox/SpiderMonkey since generators are
 * implemented.
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
exports['return'] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are resolved and passed as values (`this` is also resolved and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q.resolve(a), Q.resolve(B));
 *
 * @param {function} fn The function to decorate
 * @returns {function} a function that has been decorated.
 */
exports.promised = promised;
function promised(fn) {
    return function () {
        return all([this, all(arguments)]).spread(function (self, args) {
          return fn.apply(self, args);
        });
    };
}

/**
 * Constructs a promise method that can be used to safely observe resolution of
 * a promise for an arbitrarily named method like "propfind" in a future turn.
 */
exports.sender = deprecate(sender, "sender", "dispatcher"); // XXX deprecated, use dispatcher
exports.Method = deprecate(sender, "Method", "dispatcher"); // XXX deprecated, use dispatcher
function sender(op) {
    return function (object) {
        var args = array_slice(arguments, 1);
        return send.apply(void 0, [object, op].concat(args));
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param ...args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
exports.send = deprecate(send, "send", "dispatch"); // XXX deprecated, use dispatch
function send(object, op) {
    var deferred = defer();
    var args = array_slice(arguments, 2);
    object = resolve(object);
    nextTick(function () {
        object.promiseSend.apply(
            object,
            [op, deferred.resolve].concat(args)
        );
    });
    return deferred.promise;
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
exports.dispatch = dispatch;
function dispatch(object, op, args) {
    var deferred = defer();
    object = resolve(object);
    nextTick(function () {
        object.promiseSend.apply(
            object,
            [op, deferred.resolve].concat(args)
        );
    });
    return deferred.promise;
}

/**
 * Constructs a promise method that can be used to safely observe resolution of
 * a promise for an arbitrarily named method like "propfind" in a future turn.
 *
 * "dispatcher" constructs methods like "get(promise, name)" and "put(promise)".
 */
exports.dispatcher = dispatcher;
function dispatcher(op) {
    return function (object) {
        var args = array_slice(arguments, 1);
        return dispatch(object, op, args);
    };
}

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
exports.get = dispatcher("get");

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
exports.put = dispatcher("put");

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
exports["delete"] = // XXX experimental
exports.del = dispatcher("del");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
var post = exports.post = dispatcher("post");

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
exports.invoke = function (value, name) {
    var args = array_slice(arguments, 2);
    return post(value, name, args);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param thisp     the `this` object for the call
 * @param args      array of application arguments
 */
// XXX deprecated, use fapply
var apply = exports.apply = deprecate(dispatcher("apply"), "apply", "fapply");

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
var fapply = exports.fapply = dispatcher("fapply");

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param thisp     the `this` object for the call
 * @param ...args   array of application arguments
 */
// XXX deprecated, use fcall
exports.call = deprecate(call, "call", "fcall");
function call(value, thisp) {
    var args = array_slice(arguments, 2);
    return apply(value, thisp, args);
}

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
exports["try"] = fcall; // XXX experimental
exports.fcall = fcall;
function fcall(value) {
    var args = array_slice(arguments, 1);
    return fapply(value, args);
}

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param thisp   the `this` object for the call
 * @param ...args   array of application arguments
 */
exports.bind = deprecate(bind, "bind", "fbind"); // XXX deprecated, use fbind
function bind(value, thisp) {
    var args = array_slice(arguments, 2);
    return function bound() {
        var allArgs = args.concat(array_slice(arguments));
        return apply(value, thisp, allArgs);
    };
}

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
exports.fbind = fbind;
function fbind(value) {
    var args = array_slice(arguments, 1);
    return function fbound() {
        var allArgs = args.concat(array_slice(arguments));
        return fapply(value, allArgs);
    };
}

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually resolved object
 */
exports.keys = dispatcher("keys");

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
exports.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = promises.length;
        if (countDown === 0) {
            return resolve(promises);
        }
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            if (isFulfilled(promise)) {
                promises[index] = valueOf(promise);
                if (--countDown === 0) {
                    deferred.resolve(promises);
                }
            } else {
                when(promise, function (value) {
                    promises[index] = value;
                    if (--countDown === 0) {
                        deferred.resolve(promises);
                    }
                })
                .fail(deferred.reject);
            }
        }, void 0);
        return deferred.promise;
    });
}

/**
 * Waits for all promises to be resolved, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
exports.allResolved = allResolved;
function allResolved(promises) {
    return when(promises, function (promises) {
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return array_map(promises, resolve);
        });
    });
}

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
exports["catch"] = // XXX experimental
exports.fail = fail;
function fail(promise, rejected) {
    return when(promise, void 0, rejected);
}

/**
 * Provides an opportunity to observe the rejection of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
exports["finally"] = // XXX experimental
exports.fin = fin;
function fin(promise, callback) {
    return when(promise, function (value) {
        return when(callback(), function () {
            return value;
        });
    }, function (exception) {
        return when(callback(), function () {
            return reject(exception);
        });
    });
}

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
exports.end = end; // XXX stopgap
function end(promise) {
    when(promise, void 0, function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            // If possible (that is, if in V8), transform the error stack
            // trace by removing Node and Q cruft, then concatenating with
            // the stack trace of the promise we are ``end``ing. See #57.
            var errorStackFrames;
            if (
                Error.captureStackTrace &&
                typeof error === "object" &&
                (errorStackFrames = getStackFrames(error))
            ) {
                var promiseStackFrames = getStackFrames(promise);

                var combinedStackFrames = errorStackFrames.concat(
                    "From previous event:",
                    promiseStackFrames
                );
                error.stack = formatStackTrace(error, combinedStackFrames);
            }

            throw error;
        });
    });
}

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
exports.timeout = timeout;
function timeout(promise, ms) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error("Timed out after " + ms + " ms"));
    }, ms);

    when(promise, function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, deferred.reject);
    return deferred.promise;
}

/**
 * Returns a promise for the given value (or promised value) after some
 * milliseconds.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after some
 * time has elapsed.
 */
exports.delay = delay;
function delay(promise, timeout) {
    if (timeout === void 0) {
        timeout = promise;
        promise = void 0;
    }
    var deferred = defer();
    setTimeout(function () {
        deferred.resolve(promise);
    }, timeout);
    return deferred.promise;
}

/**
 * Passes a continuation to a Node function, which is called with a given
 * `this` value and arguments provided as an array, and returns a promise.
 *
 *      var FS = (require)("fs");
 *      Q.napply(FS.readFile, FS, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
exports.napply = napply;
function napply(callback, thisp, args) {
    return nbind(callback, thisp).apply(void 0, args);
}

/**
 * Passes a continuation to a Node function, which is called with a given
 * `this` value and arguments provided individually, and returns a promise.
 *
 *      var FS = (require)("fs");
 *      Q.ncall(FS.readFile, FS, __filename)
 *      .then(function (content) {
 *      })
 *
 */
exports.ncall = ncall;
function ncall(callback, thisp /*, ...args*/) {
    var args = array_slice(arguments, 2);
    return napply(callback, thisp, args);
}

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 *
 *      Q.nbind(FS.readFile, FS)(__filename)
 *      .then(console.log)
 *      .end()
 *
 */
exports.nbind = nbind;
function nbind(callback /* thisp, ...args*/) {
    if (arguments.length > 1) {
        var thisp = arguments[1];
        var args = array_slice(arguments, 2);

        var originalCallback = callback;
        callback = function () {
            var combinedArgs = args.concat(array_slice(arguments));
            return originalCallback.apply(thisp, combinedArgs);
        };
    }
    return function () {
        var deferred = defer();
        var args = array_slice(arguments);
        // add a continuation that resolves the promise
        args.push(deferred.makeNodeResolver());
        // trap exceptions thrown by the callback
        fapply(callback, args)
        .fail(deferred.reject);
        return deferred.promise;
    };
}

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
exports.npost = npost;
function npost(object, name, args) {
    return napply(object[name], object, args);
}

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
exports.ninvoke = ninvoke;
function ninvoke(object, name /*, ...args*/) {
    var args = array_slice(arguments, 2);
    return napply(object[name], object, args);
}

defend(exports);

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

});

});

require.define("/projects/zombiekit/lib/zepto.js",function(require,module,exports,__dirname,__filename,process){/* Zepto v1.0rc1 - polyfill zepto event detect fx ajax form touch - zeptojs.com/license */
;(function(undefined){
  if (String.prototype.trim === undefined) // fix for iOS 3.2
    String.prototype.trim = function(){ return this.replace(/^\s+/, '').replace(/\s+$/, '') }

  // For iOS 3.x
  // from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/reduce
  if (Array.prototype.reduce === undefined)
    Array.prototype.reduce = function(fun){
      if(this === void 0 || this === null) throw new TypeError()
      var t = Object(this), len = t.length >>> 0, k = 0, accumulator
      if(typeof fun != 'function') throw new TypeError()
      if(len == 0 && arguments.length == 1) throw new TypeError()

      if(arguments.length >= 2)
       accumulator = arguments[1]
      else
        do{
          if(k in t){
            accumulator = t[k++]
            break
          }
          if(++k >= len) throw new TypeError()
        } while (true)

      while (k < len){
        if(k in t) accumulator = fun.call(undefined, accumulator, t[k], k, t)
        k++
      }
      return accumulator
    }

})()
var Zepto = (function() {
  var undefined, key, $, classList, emptyArray = [], slice = emptyArray.slice,
    document = window.document,
    elementDisplay = {}, classCache = {},
    getComputedStyle = document.defaultView.getComputedStyle,
    cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1,'opacity': 1, 'z-index': 1, 'zoom': 1 },
    fragmentRE = /^\s*<(\w+|!)[^>]*>/,

    // Used by `$.zepto.init` to wrap elements, text/comment nodes, document,
    // and document fragment node types.
    elementTypes = [1, 3, 8, 9, 11],

    adjacencyOperators = [ 'after', 'prepend', 'before', 'append' ],
    table = document.createElement('table'),
    tableRow = document.createElement('tr'),
    containers = {
      'tr': document.createElement('tbody'),
      'tbody': table, 'thead': table, 'tfoot': table,
      'td': tableRow, 'th': tableRow,
      '*': document.createElement('div')
    },
    readyRE = /complete|loaded|interactive/,
    classSelectorRE = /^\.([\w-]+)$/,
    idSelectorRE = /^#([\w-]+)$/,
    tagSelectorRE = /^[\w-]+$/,
    toString = ({}).toString,
    zepto = {},
    camelize, uniq,
    tempParent = document.createElement('div')

  zepto.matches = function(element, selector) {
    if (!element || element.nodeType !== 1) return false
    var matchesSelector = element.webkitMatchesSelector || element.mozMatchesSelector ||
                          element.oMatchesSelector || element.matchesSelector
    if (matchesSelector) return matchesSelector.call(element, selector)
    // fall back to performing a selector:
    var match, parent = element.parentNode, temp = !parent
    if (temp) (parent = tempParent).appendChild(element)
    match = ~zepto.qsa(parent, selector).indexOf(element)
    temp && tempParent.removeChild(element)
    return match
  }

  function isFunction(value) { return toString.call(value) == "[object Function]" }
  function isObject(value) { return value instanceof Object }
  function isPlainObject(value) {
    var key, ctor
    if (toString.call(value) !== "[object Object]") return false
    ctor = (isFunction(value.constructor) && value.constructor.prototype)
    if (!ctor || !hasOwnProperty.call(ctor, 'isPrototypeOf')) return false
    for (key in value);
    return key === undefined || hasOwnProperty.call(value, key)
  }
  function isArray(value) { return value instanceof Array }
  function likeArray(obj) { return typeof obj.length == 'number' }

  function compact(array) { return array.filter(function(item){ return item !== undefined && item !== null }) }
  function flatten(array) { return array.length > 0 ? [].concat.apply([], array) : array }
  camelize = function(str){ return str.replace(/-+(.)?/g, function(match, chr){ return chr ? chr.toUpperCase() : '' }) }
  function dasherize(str) {
    return str.replace(/::/g, '/')
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z\d])([A-Z])/g, '$1_$2')
           .replace(/_/g, '-')
           .toLowerCase()
  }
  uniq = function(array){ return array.filter(function(item, idx){ return array.indexOf(item) == idx }) }

  function classRE(name) {
    return name in classCache ?
      classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
  }

  function maybeAddPx(name, value) {
    return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
  }

  function defaultDisplay(nodeName) {
    var element, display
    if (!elementDisplay[nodeName]) {
      element = document.createElement(nodeName)
      document.body.appendChild(element)
      display = getComputedStyle(element, '').getPropertyValue("display")
      element.parentNode.removeChild(element)
      display == "none" && (display = "block")
      elementDisplay[nodeName] = display
    }
    return elementDisplay[nodeName]
  }

  // `$.zepto.fragment` takes a html string and an optional tag name
  // to generate DOM nodes nodes from the given html string.
  // The generated DOM nodes are returned as an array.
  // This function can be overriden in plugins for example to make
  // it compatible with browsers that don't support the DOM fully.
  zepto.fragment = function(html, name) {
    if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
    if (!(name in containers)) name = '*'
    var container = containers[name]
    container.innerHTML = '' + html
    return $.each(slice.call(container.childNodes), function(){
      container.removeChild(this)
    })
  }

  // `$.zepto.Z` swaps out the prototype of the given `dom` array
  // of nodes with `$.fn` and thus supplying all the Zepto functions
  // to the array. Note that `__proto__` is not supported on Internet
  // Explorer. This method can be overriden in plugins.
  zepto.Z = function(dom, selector) {
    dom = dom || []
    dom.__proto__ = arguments.callee.prototype
    dom.selector = selector || ''
    return dom
  }

  // `$.zepto.isZ` should return `true` if the given object is a Zepto
  // collection. This method can be overriden in plugins.
  zepto.isZ = function(object) {
    return object instanceof zepto.Z
  }

  // `$.zepto.init` is Zepto's counterpart to jQuery's `$.fn.init` and
  // takes a CSS selector and an optional context (and handles various
  // special cases).
  // This method can be overriden in plugins.
  zepto.init = function(selector, context) {
    // If nothing given, return an empty Zepto collection
    if (!selector) return zepto.Z()
    // If a function is given, call it when the DOM is ready
    else if (isFunction(selector)) return $(document).ready(selector)
    // If a Zepto collection is given, juts return it
    else if (zepto.isZ(selector)) return selector
    else {
      var dom
      // normalize array if an array of nodes is given
      if (isArray(selector)) dom = compact(selector)
      // if a JavaScript object is given, return a copy of it
      // this is a somewhat peculiar option, but supported by
      // jQuery so we'll do it, too
      else if (isPlainObject(selector))
        dom = [$.extend({}, selector)], selector = null
      // wrap stuff like `document` or `window`
      else if (elementTypes.indexOf(selector.nodeType) >= 0 || selector === window)
        dom = [selector], selector = null
      // If it's a html fragment, create nodes from it
      else if (fragmentRE.test(selector))
        dom = zepto.fragment(selector.trim(), RegExp.$1), selector = null
      // If there's a context, create a collection on that context first, and select
      // nodes from there
      else if (context !== undefined) return $(context).find(selector)
      // And last but no least, if it's a CSS selector, use it to select nodes.
      else dom = zepto.qsa(document, selector)
      // create a new Zepto collection from the nodes found
      return zepto.Z(dom, selector)
    }
  }

  // `$` will be the base `Zepto` object. When calling this
  // function just call `$.zepto.init, whichs makes the implementation
  // details of selecting nodes and creating Zepto collections
  // patchable in plugins.
  $ = function(selector, context){
    return zepto.init(selector, context)
  }

  // Copy all but undefined properties from one or more
  // objects to the `target` object.
  $.extend = function(target){
    slice.call(arguments, 1).forEach(function(source) {
      for (key in source)
        if (source[key] !== undefined)
          target[key] = source[key]
    })
    return target
  }

  // `$.zepto.qsa` is Zepto's CSS selector implementation which
  // uses `document.querySelectorAll` and optimizes for some special cases, like `#id`.
  // This method can be overriden in plugins.
  zepto.qsa = function(element, selector){
    var found
    return (element === document && idSelectorRE.test(selector)) ?
      ( (found = element.getElementById(RegExp.$1)) ? [found] : emptyArray ) :
      (element.nodeType !== 1 && element.nodeType !== 9) ? emptyArray :
      slice.call(
        classSelectorRE.test(selector) ? element.getElementsByClassName(RegExp.$1) :
        tagSelectorRE.test(selector) ? element.getElementsByTagName(selector) :
        element.querySelectorAll(selector)
      )
  }

  function filtered(nodes, selector) {
    return selector === undefined ? $(nodes) : $(nodes).filter(selector)
  }

  function funcArg(context, arg, idx, payload) {
   return isFunction(arg) ? arg.call(context, idx, payload) : arg
  }

  $.isFunction = isFunction
  $.isObject = isObject
  $.isArray = isArray
  $.isPlainObject = isPlainObject

  $.inArray = function(elem, array, i){
    return emptyArray.indexOf.call(array, elem, i)
  }

  $.trim = function(str) { return str.trim() }

  // plugin compatibility
  $.uuid = 0

  $.map = function(elements, callback){
    var value, values = [], i, key
    if (likeArray(elements))
      for (i = 0; i < elements.length; i++) {
        value = callback(elements[i], i)
        if (value != null) values.push(value)
      }
    else
      for (key in elements) {
        value = callback(elements[key], key)
        if (value != null) values.push(value)
      }
    return flatten(values)
  }

  $.each = function(elements, callback){
    var i, key
    if (likeArray(elements)) {
      for (i = 0; i < elements.length; i++)
        if (callback.call(elements[i], i, elements[i]) === false) return elements
    } else {
      for (key in elements)
        if (callback.call(elements[key], key, elements[key]) === false) return elements
    }

    return elements
  }

  // Define methods that will be available on all
  // Zepto collections
  $.fn = {
    // Because a collection acts like an array
    // copy over these useful array functions.
    forEach: emptyArray.forEach,
    reduce: emptyArray.reduce,
    push: emptyArray.push,
    indexOf: emptyArray.indexOf,
    concat: emptyArray.concat,

    // `map` and `slice` in the jQuery API work differently
    // from their array counterparts
    map: function(fn){
      return $.map(this, function(el, i){ return fn.call(el, i, el) })
    },
    slice: function(){
      return $(slice.apply(this, arguments))
    },

    ready: function(callback){
      if (readyRE.test(document.readyState)) callback($)
      else document.addEventListener('DOMContentLoaded', function(){ callback($) }, false)
      return this
    },
    get: function(idx){
      return idx === undefined ? slice.call(this) : this[idx]
    },
    toArray: function(){ return this.get() },
    size: function(){
      return this.length
    },
    remove: function(){
      return this.each(function(){
        if (this.parentNode != null)
          this.parentNode.removeChild(this)
      })
    },
    each: function(callback){
      this.forEach(function(el, idx){ callback.call(el, idx, el) })
      return this
    },
    filter: function(selector){
      return $([].filter.call(this, function(element){
        return zepto.matches(element, selector)
      }))
    },
    add: function(selector,context){
      return $(uniq(this.concat($(selector,context))))
    },
    is: function(selector){
      return this.length > 0 && zepto.matches(this[0], selector)
    },
    not: function(selector){
      var nodes=[]
      if (isFunction(selector) && selector.call !== undefined)
        this.each(function(idx){
          if (!selector.call(this,idx)) nodes.push(this)
        })
      else {
        var excludes = typeof selector == 'string' ? this.filter(selector) :
          (likeArray(selector) && isFunction(selector.item)) ? slice.call(selector) : $(selector)
        this.forEach(function(el){
          if (excludes.indexOf(el) < 0) nodes.push(el)
        })
      }
      return $(nodes)
    },
    eq: function(idx){
      return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
    },
    first: function(){
      var el = this[0]
      return el && !isObject(el) ? el : $(el)
    },
    last: function(){
      var el = this[this.length - 1]
      return el && !isObject(el) ? el : $(el)
    },
    find: function(selector){
      var result
      if (this.length == 1) result = zepto.qsa(this[0], selector)
      else result = this.map(function(){ return zepto.qsa(this, selector) })
      return $(result)
    },
    closest: function(selector, context){
      var node = this[0]
      while (node && !zepto.matches(node, selector))
        node = node !== context && node !== document && node.parentNode
      return $(node)
    },
    parents: function(selector){
      var ancestors = [], nodes = this
      while (nodes.length > 0)
        nodes = $.map(nodes, function(node){
          if ((node = node.parentNode) && node !== document && ancestors.indexOf(node) < 0) {
            ancestors.push(node)
            return node
          }
        })
      return filtered(ancestors, selector)
    },
    parent: function(selector){
      return filtered(uniq(this.pluck('parentNode')), selector)
    },
    children: function(selector){
      return filtered(this.map(function(){ return slice.call(this.children) }), selector)
    },
    siblings: function(selector){
      return filtered(this.map(function(i, el){
        return slice.call(el.parentNode.children).filter(function(child){ return child!==el })
      }), selector)
    },
    empty: function(){
      return this.each(function(){ this.innerHTML = '' })
    },
    // `pluck` is borrowed from Prototype.js
    pluck: function(property){
      return this.map(function(){ return this[property] })
    },
    show: function(){
      return this.each(function(){
        this.style.display == "none" && (this.style.display = null)
        if (getComputedStyle(this, '').getPropertyValue("display") == "none")
          this.style.display = defaultDisplay(this.nodeName)
      })
    },
    replaceWith: function(newContent){
      return this.before(newContent).remove()
    },
    wrap: function(newContent){
      return this.each(function(){
        $(this).wrapAll($(newContent)[0].cloneNode(false))
      })
    },
    wrapAll: function(newContent){
      if (this[0]) {
        $(this[0]).before(newContent = $(newContent))
        newContent.append(this)
      }
      return this
    },
    unwrap: function(){
      this.parent().each(function(){
        $(this).replaceWith($(this).children())
      })
      return this
    },
    clone: function(){
      return $(this.map(function(){ return this.cloneNode(true) }))
    },
    hide: function(){
      return this.css("display", "none")
    },
    toggle: function(setting){
      return (setting === undefined ? this.css("display") == "none" : setting) ? this.show() : this.hide()
    },
    prev: function(){ return $(this.pluck('previousElementSibling')) },
    next: function(){ return $(this.pluck('nextElementSibling')) },
    html: function(html){
      return html === undefined ?
        (this.length > 0 ? this[0].innerHTML : null) :
        this.each(function(idx){
          var originHtml = this.innerHTML
          $(this).empty().append( funcArg(this, html, idx, originHtml) )
        })
    },
    text: function(text){
      return text === undefined ?
        (this.length > 0 ? this[0].textContent : null) :
        this.each(function(){ this.textContent = text })
    },
    attr: function(name, value){
      var result
      return (typeof name == 'string' && value === undefined) ?
        (this.length == 0 || this[0].nodeType !== 1 ? undefined :
          (name == 'value' && this[0].nodeName == 'INPUT') ? this.val() :
          (!(result = this[0].getAttribute(name)) && name in this[0]) ? this[0][name] : result
        ) :
        this.each(function(idx){
          if (this.nodeType !== 1) return
          if (isObject(name)) for (key in name) this.setAttribute(key, name[key])
          else this.setAttribute(name, funcArg(this, value, idx, this.getAttribute(name)))
        })
    },
    removeAttr: function(name){
      return this.each(function(){ if (this.nodeType === 1) this.removeAttribute(name) })
    },
    prop: function(name, value){
      return (value === undefined) ?
        (this[0] ? this[0][name] : undefined) :
        this.each(function(idx){
          this[name] = funcArg(this, value, idx, this[name])
        })
    },
    data: function(name, value){
      var data = this.attr('data-' + dasherize(name), value)
      return data !== null ? data : undefined
    },
    val: function(value){
      return (value === undefined) ?
        (this.length > 0 ? this[0].value : undefined) :
        this.each(function(idx){
          this.value = funcArg(this, value, idx, this.value)
        })
    },
    offset: function(){
      if (this.length==0) return null
      var obj = this[0].getBoundingClientRect()
      return {
        left: obj.left + window.pageXOffset,
        top: obj.top + window.pageYOffset,
        width: obj.width,
        height: obj.height
      }
    },
    css: function(property, value){
      if (value === undefined && typeof property == 'string')
        return (
          this.length == 0
            ? undefined
            : this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

      var css = ''
      for (key in property)
        if(typeof property[key] == 'string' && property[key] == '')
          this.each(function(){ this.style.removeProperty(dasherize(key)) })
        else
          css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'

      if (typeof property == 'string')
        if (value == '')
          this.each(function(){ this.style.removeProperty(dasherize(property)) })
        else
          css = dasherize(property) + ":" + maybeAddPx(property, value)

      return this.each(function(){ this.style.cssText += ';' + css })
    },
    index: function(element){
      return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
    },
    hasClass: function(name){
      if (this.length < 1) return false
      else return classRE(name).test(this[0].className)
    },
    addClass: function(name){
      return this.each(function(idx){
        classList = []
        var cls = this.className, newName = funcArg(this, name, idx, cls)
        newName.split(/\s+/g).forEach(function(klass){
          if (!$(this).hasClass(klass)) classList.push(klass)
        }, this)
        classList.length && (this.className += (cls ? " " : "") + classList.join(" "))
      })
    },
    removeClass: function(name){
      return this.each(function(idx){
        if (name === undefined)
          return this.className = ''
        classList = this.className
        funcArg(this, name, idx, classList).split(/\s+/g).forEach(function(klass){
          classList = classList.replace(classRE(klass), " ")
        })
        this.className = classList.trim()
      })
    },
    toggleClass: function(name, when){
      return this.each(function(idx){
        var newName = funcArg(this, name, idx, this.className)
        ;(when === undefined ? !$(this).hasClass(newName) : when) ?
          $(this).addClass(newName) : $(this).removeClass(newName)
      })
    }
  }

  // Generate the `width` and `height` functions
  ;['width', 'height'].forEach(function(dimension){
    $.fn[dimension] = function(value){
      var offset, Dimension = dimension.replace(/./, function(m){ return m[0].toUpperCase() })
      if (value === undefined) return this[0] == window ? window['inner' + Dimension] :
        this[0] == document ? document.documentElement['offset' + Dimension] :
        (offset = this.offset()) && offset[dimension]
      else return this.each(function(idx){
        var el = $(this)
        el.css(dimension, funcArg(this, value, idx, el[dimension]()))
      })
    }
  })

  function insert(operator, target, node) {
    var parent = (operator % 2) ? target : target.parentNode
    parent ? parent.insertBefore(node,
      !operator ? target.nextSibling :      // after
      operator == 1 ? parent.firstChild :   // prepend
      operator == 2 ? target :              // before
      null) :                               // append
      $(node).remove()
  }

  function traverseNode(node, fun) {
    fun(node)
    for (var key in node.childNodes) traverseNode(node.childNodes[key], fun)
  }

  // Generate the `after`, `prepend`, `before`, `append`,
  // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
  adjacencyOperators.forEach(function(key, operator) {
    $.fn[key] = function(){
      // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
      var nodes = $.map(arguments, function(n){ return isObject(n) ? n : zepto.fragment(n) })
      if (nodes.length < 1) return this
      var size = this.length, copyByClone = size > 1, inReverse = operator < 2

      return this.each(function(index, target){
        for (var i = 0; i < nodes.length; i++) {
          var node = nodes[inReverse ? nodes.length-i-1 : i]
          traverseNode(node, function(node){
            if (node.nodeName != null && node.nodeName.toUpperCase() === 'SCRIPT' && (!node.type || node.type === 'text/javascript'))
              window['eval'].call(window, node.innerHTML)
          })
          if (copyByClone && index < size - 1) node = node.cloneNode(true)
          insert(operator, target, node)
        }
      })
    }

    $.fn[(operator % 2) ? key+'To' : 'insert'+(operator ? 'Before' : 'After')] = function(html){
      $(html)[key](this)
      return this
    }
  })

  zepto.Z.prototype = $.fn

  // Export internal API functions in the `$.zepto` namespace
  zepto.camelize = camelize
  zepto.uniq = uniq
  $.zepto = zepto

  return $
})()

// If `$` is not yet defined, point it to `Zepto`
window.Zepto = Zepto
'$' in window || (window.$ = Zepto)
;(function($){
  var $$ = $.zepto.qsa, handlers = {}, _zid = 1, specialEvents={}

  specialEvents.click = specialEvents.mousedown = specialEvents.mouseup = specialEvents.mousemove = 'MouseEvents'

  function zid(element) {
    return element._zid || (element._zid = _zid++)
  }
  function findHandlers(element, event, fn, selector) {
    event = parse(event)
    if (event.ns) var matcher = matcherFor(event.ns)
    return (handlers[zid(element)] || []).filter(function(handler) {
      return handler
        && (!event.e  || handler.e == event.e)
        && (!event.ns || matcher.test(handler.ns))
        && (!fn       || zid(handler.fn) === zid(fn))
        && (!selector || handler.sel == selector)
    })
  }
  function parse(event) {
    var parts = ('' + event).split('.')
    return {e: parts[0], ns: parts.slice(1).sort().join(' ')}
  }
  function matcherFor(ns) {
    return new RegExp('(?:^| )' + ns.replace(' ', ' .* ?') + '(?: |$)')
  }

  function eachEvent(events, fn, iterator){
    if ($.isObject(events)) $.each(events, iterator)
    else events.split(/\s/).forEach(function(type){ iterator(type, fn) })
  }

  function add(element, events, fn, selector, getDelegate, capture){
    capture = !!capture
    var id = zid(element), set = (handlers[id] || (handlers[id] = []))
    eachEvent(events, fn, function(event, fn){
      var delegate = getDelegate && getDelegate(fn, event),
        callback = delegate || fn
      var proxyfn = function (event) {
        var result = callback.apply(element, [event].concat(event.data))
        if (result === false) event.preventDefault()
        return result
      }
      var handler = $.extend(parse(event), {fn: fn, proxy: proxyfn, sel: selector, del: delegate, i: set.length})
      set.push(handler)
      element.addEventListener(handler.e, proxyfn, capture)
    })
  }
  function remove(element, events, fn, selector){
    var id = zid(element)
    eachEvent(events || '', fn, function(event, fn){
      findHandlers(element, event, fn, selector).forEach(function(handler){
        delete handlers[id][handler.i]
        element.removeEventListener(handler.e, handler.proxy, false)
      })
    })
  }

  $.event = { add: add, remove: remove }

  $.proxy = function(fn, context) {
    if ($.isFunction(fn)) {
      var proxyFn = function(){ return fn.apply(context, arguments) }
      proxyFn._zid = zid(fn)
      return proxyFn
    } else if (typeof context == 'string') {
      return $.proxy(fn[context], fn)
    } else {
      throw new TypeError("expected function")
    }
  }

  $.fn.bind = function(event, callback){
    return this.each(function(){
      add(this, event, callback)
    })
  }
  $.fn.unbind = function(event, callback){
    return this.each(function(){
      remove(this, event, callback)
    })
  }
  $.fn.one = function(event, callback){
    return this.each(function(i, element){
      add(this, event, callback, null, function(fn, type){
        return function(){
          var result = fn.apply(element, arguments)
          remove(element, type, fn)
          return result
        }
      })
    })
  }

  var returnTrue = function(){return true},
      returnFalse = function(){return false},
      eventMethods = {
        preventDefault: 'isDefaultPrevented',
        stopImmediatePropagation: 'isImmediatePropagationStopped',
        stopPropagation: 'isPropagationStopped'
      }
  function createProxy(event) {
    var proxy = $.extend({originalEvent: event}, event)
    $.each(eventMethods, function(name, predicate) {
      proxy[name] = function(){
        this[predicate] = returnTrue
        return event[name].apply(event, arguments)
      }
      proxy[predicate] = returnFalse
    })
    return proxy
  }

  // emulates the 'defaultPrevented' property for browsers that have none
  function fix(event) {
    if (!('defaultPrevented' in event)) {
      event.defaultPrevented = false
      var prevent = event.preventDefault
      event.preventDefault = function() {
        this.defaultPrevented = true
        prevent.call(this)
      }
    }
  }

  $.fn.delegate = function(selector, event, callback){
    var capture = false
    if(event == 'blur' || event == 'focus'){
      if($.iswebkit)
        event = event == 'blur' ? 'focusout' : event == 'focus' ? 'focusin' : event
      else
        capture = true
    }

    return this.each(function(i, element){
      add(element, event, callback, selector, function(fn){
        return function(e){
          var evt, match = $(e.target).closest(selector, element).get(0)
          if (match) {
            evt = $.extend(createProxy(e), {currentTarget: match, liveFired: element})
            return fn.apply(match, [evt].concat([].slice.call(arguments, 1)))
          }
        }
      }, capture)
    })
  }
  $.fn.undelegate = function(selector, event, callback){
    return this.each(function(){
      remove(this, event, callback, selector)
    })
  }

  $.fn.live = function(event, callback){
    $(document.body).delegate(this.selector, event, callback)
    return this
  }
  $.fn.die = function(event, callback){
    $(document.body).undelegate(this.selector, event, callback)
    return this
  }

  $.fn.on = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.bind(event, selector) : this.delegate(selector, event, callback)
  }
  $.fn.off = function(event, selector, callback){
    return selector == undefined || $.isFunction(selector) ?
      this.unbind(event, selector) : this.undelegate(selector, event, callback)
  }

  $.fn.trigger = function(event, data){
    if (typeof event == 'string') event = $.Event(event)
    fix(event)
    event.data = data
    return this.each(function(){
      // items in the collection might not be DOM elements
      // (todo: possibly support events on plain old objects)
      if('dispatchEvent' in this) this.dispatchEvent(event)
    })
  }

  // triggers event handlers on current element just as if an event occurred,
  // doesn't trigger an actual event, doesn't bubble
  $.fn.triggerHandler = function(event, data){
    var e, result
    this.each(function(i, element){
      e = createProxy(typeof event == 'string' ? $.Event(event) : event)
      e.data = data
      e.target = element
      $.each(findHandlers(element, event.type || event), function(i, handler){
        result = handler.proxy(e)
        if (e.isImmediatePropagationStopped()) return false
      })
    })
    return result
  }

  // shortcut methods for `.bind(event, fn)` for each event type
  ;('focusin focusout load resize scroll unload click dblclick '+
  'mousedown mouseup mousemove mouseover mouseout '+
  'change select keydown keypress keyup error').split(' ').forEach(function(event) {
    $.fn[event] = function(callback){ return this.bind(event, callback) }
  })

  ;['focus', 'blur'].forEach(function(name) {
    $.fn[name] = function(callback) {
      if (callback) this.bind(name, callback)
      else if (this.length) try { this.get(0)[name]() } catch(e){}
      return this
    }
  })

  $.Event = function(type, props) {
    var event = document.createEvent(specialEvents[type] || 'Events'), bubbles = true
    if (props) for (var name in props) (name == 'bubbles') ? (bubbles = !!props[name]) : (event[name] = props[name])
    event.initEvent(type, bubbles, true, null, null, null, null, null, null, null, null, null, null, null, null)
    return event
  }

})(Zepto)
;(function($){
  function detect(ua){
    var os = this.os = {}, browser = this.browser = {},
      webkit = ua.match(/WebKit\/([\d.]+)/),
      android = ua.match(/(Android)\s+([\d.]+)/),
      ipad = ua.match(/(iPad).*OS\s([\d_]+)/),
      iphone = !ipad && ua.match(/(iPhone\sOS)\s([\d_]+)/),
      webos = ua.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),
      touchpad = webos && ua.match(/TouchPad/),
      kindle = ua.match(/Kindle\/([\d.]+)/),
      silk = ua.match(/Silk\/([\d._]+)/),
      blackberry = ua.match(/(BlackBerry).*Version\/([\d.]+)/)

    // todo clean this up with a better OS/browser
    // separation. we need to discern between multiple
    // browsers on android, and decide if kindle fire in
    // silk mode is android or not

    if (browser.webkit = !!webkit) browser.version = webkit[1]

    if (android) os.android = true, os.version = android[2]
    if (iphone) os.ios = os.iphone = true, os.version = iphone[2].replace(/_/g, '.')
    if (ipad) os.ios = os.ipad = true, os.version = ipad[2].replace(/_/g, '.')
    if (webos) os.webos = true, os.version = webos[2]
    if (touchpad) os.touchpad = true
    if (blackberry) os.blackberry = true, os.version = blackberry[2]
    if (kindle) os.kindle = true, os.version = kindle[1]
    if (silk) browser.silk = true, browser.version = silk[1]
    if (!silk && os.android && ua.match(/Kindle Fire/)) browser.silk = true
  }

  detect.call($, navigator.userAgent)
  // make available to unit tests
  $.__detect = detect

})(Zepto)
;(function($, undefined){
  var prefix = '', eventPrefix, endEventName, endAnimationName,
    vendors = { Webkit: 'webkit', Moz: '', O: 'o', ms: 'MS' },
    document = window.document, testEl = document.createElement('div'),
    supportedTransforms = /^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,
    clearProperties = {}

  function downcase(str) { return str.toLowerCase() }
  function normalizeEvent(name) { return eventPrefix ? eventPrefix + name : downcase(name) }

  $.each(vendors, function(vendor, event){
    if (testEl.style[vendor + 'TransitionProperty'] !== undefined) {
      prefix = '-' + downcase(vendor) + '-'
      eventPrefix = event
      return false
    }
  })

  clearProperties[prefix + 'transition-property'] =
  clearProperties[prefix + 'transition-duration'] =
  clearProperties[prefix + 'transition-timing-function'] =
  clearProperties[prefix + 'animation-name'] =
  clearProperties[prefix + 'animation-duration'] = ''

  $.fx = {
    off: (eventPrefix === undefined && testEl.style.transitionProperty === undefined),
    cssPrefix: prefix,
    transitionEnd: normalizeEvent('TransitionEnd'),
    animationEnd: normalizeEvent('AnimationEnd')
  }

  $.fn.animate = function(properties, duration, ease, callback){
    if ($.isObject(duration))
      ease = duration.easing, callback = duration.complete, duration = duration.duration
    if (duration) duration = duration / 1000
    return this.anim(properties, duration, ease, callback)
  }

  $.fn.anim = function(properties, duration, ease, callback){
    var transforms, cssProperties = {}, key, that = this, wrappedCallback, endEvent = $.fx.transitionEnd
    if (duration === undefined) duration = 0.4
    if ($.fx.off) duration = 0

    if (typeof properties == 'string') {
      // keyframe animation
      cssProperties[prefix + 'animation-name'] = properties
      cssProperties[prefix + 'animation-duration'] = duration + 's'
      endEvent = $.fx.animationEnd
    } else {
      // CSS transitions
      for (key in properties)
        if (supportedTransforms.test(key)) {
          transforms || (transforms = [])
          transforms.push(key + '(' + properties[key] + ')')
        }
        else cssProperties[key] = properties[key]

      if (transforms) cssProperties[prefix + 'transform'] = transforms.join(' ')
      if (!$.fx.off && typeof properties === 'object') {
        cssProperties[prefix + 'transition-property'] = Object.keys(properties).join(', ')
        cssProperties[prefix + 'transition-duration'] = duration + 's'
        cssProperties[prefix + 'transition-timing-function'] = (ease || 'linear')
      }
    }

    wrappedCallback = function(event){
      if (typeof event !== 'undefined') {
        if (event.target !== event.currentTarget) return // makes sure the event didn't bubble from "below"
        $(event.target).unbind(endEvent, arguments.callee)
      }
      $(this).css(clearProperties)
      callback && callback.call(this)
    }
    if (duration > 0) this.bind(endEvent, wrappedCallback)

    setTimeout(function() {
      that.css(cssProperties)
      if (duration <= 0) setTimeout(function() {
        that.each(function(){ wrappedCallback.call(this) })
      }, 0)
    }, 0)

    return this
  }

  testEl = null
})(Zepto)
;(function($){
  var jsonpID = 0,
      isObject = $.isObject,
      document = window.document,
      key,
      name,
      rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      scriptTypeRE = /^(?:text|application)\/javascript/i,
      xmlTypeRE = /^(?:text|application)\/xml/i,
      jsonType = 'application/json',
      htmlType = 'text/html',
      blankRE = /^\s*$/

  // trigger a custom event and return false if it was cancelled
  function triggerAndReturn(context, eventName, data) {
    var event = $.Event(eventName)
    $(context).trigger(event, data)
    return !event.defaultPrevented
  }

  // trigger an Ajax "global" event
  function triggerGlobal(settings, context, eventName, data) {
    if (settings.global) return triggerAndReturn(context || document, eventName, data)
  }

  // Number of active Ajax requests
  $.active = 0

  function ajaxStart(settings) {
    if (settings.global && $.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
  }
  function ajaxStop(settings) {
    if (settings.global && !(--$.active)) triggerGlobal(settings, null, 'ajaxStop')
  }

  // triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
  function ajaxBeforeSend(xhr, settings) {
    var context = settings.context
    if (settings.beforeSend.call(context, xhr, settings) === false ||
        triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
      return false

    triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
  }
  function ajaxSuccess(data, xhr, settings) {
    var context = settings.context, status = 'success'
    settings.success.call(context, data, status, xhr)
    triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
    ajaxComplete(status, xhr, settings)
  }
  // type: "timeout", "error", "abort", "parsererror"
  function ajaxError(error, type, xhr, settings) {
    var context = settings.context
    settings.error.call(context, xhr, type, error)
    triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
    ajaxComplete(type, xhr, settings)
  }
  // status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
  function ajaxComplete(status, xhr, settings) {
    var context = settings.context
    settings.complete.call(context, xhr, status)
    triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
    ajaxStop(settings)
  }

  // Empty function, used as default callback
  function empty() {}

  $.ajaxJSONP = function(options){
    var callbackName = 'jsonp' + (++jsonpID),
      script = document.createElement('script'),
      abort = function(){
        $(script).remove()
        if (callbackName in window) window[callbackName] = empty
        ajaxComplete('abort', xhr, options)
      },
      xhr = { abort: abort }, abortTimeout

    if (options.error) script.onerror = function() {
      xhr.abort()
      options.error()
    }

    window[callbackName] = function(data){
      clearTimeout(abortTimeout)
      $(script).remove()
      delete window[callbackName]
      ajaxSuccess(data, xhr, options)
    }

    serializeData(options)
    script.src = options.url.replace(/=\?/, '=' + callbackName)
    $('head').append(script)

    if (options.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.abort()
        ajaxComplete('timeout', xhr, options)
      }, options.timeout)

    return xhr
  }

  $.ajaxSettings = {
    // Default type of request
    type: 'GET',
    // Callback that is executed before request
    beforeSend: empty,
    // Callback that is executed if the request succeeds
    success: empty,
    // Callback that is executed the the server drops error
    error: empty,
    // Callback that is executed on request complete (both: error and success)
    complete: empty,
    // The context for the callbacks
    context: null,
    // Whether to trigger "global" Ajax events
    global: true,
    // Transport
    xhr: function () {
      return new window.XMLHttpRequest()
    },
    // MIME types mapping
    accepts: {
      script: 'text/javascript, application/javascript',
      json:   jsonType,
      xml:    'application/xml, text/xml',
      html:   htmlType,
      text:   'text/plain'
    },
    // Whether the request is to another domain
    crossDomain: false,
    // Default timeout
    timeout: 0
  }

  function mimeToDataType(mime) {
    return mime && ( mime == htmlType ? 'html' :
      mime == jsonType ? 'json' :
      scriptTypeRE.test(mime) ? 'script' :
      xmlTypeRE.test(mime) && 'xml' ) || 'text'
  }

  function appendQuery(url, query) {
    return (url + '&' + query).replace(/[&?]{1,2}/, '?')
  }

  // serialize payload and append it to the URL for GET requests
  function serializeData(options) {
    if (isObject(options.data)) options.data = $.param(options.data)
    if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
      options.url = appendQuery(options.url, options.data)
  }

  $.ajax = function(options){
    var settings = $.extend({}, options || {})
    for (key in $.ajaxSettings) if (settings[key] === undefined) settings[key] = $.ajaxSettings[key]

    ajaxStart(settings)

    if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
      RegExp.$2 != window.location.host

    var dataType = settings.dataType, hasPlaceholder = /=\?/.test(settings.url)
    if (dataType == 'jsonp' || hasPlaceholder) {
      if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
      return $.ajaxJSONP(settings)
    }

    if (!settings.url) settings.url = window.location.toString()
    serializeData(settings)

    var mime = settings.accepts[dataType],
        baseHeaders = { },
        protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
        xhr = $.ajaxSettings.xhr(), abortTimeout

    if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
    if (mime) {
      baseHeaders['Accept'] = mime
      if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
      xhr.overrideMimeType && xhr.overrideMimeType(mime)
    }
    if (settings.contentType || (settings.data && settings.type.toUpperCase() != 'GET'))
      baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
    settings.headers = $.extend(baseHeaders, settings.headers || {})

    xhr.onreadystatechange = function(){
      if (xhr.readyState == 4) {
        clearTimeout(abortTimeout)
        var result, error = false
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
          dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
          result = xhr.responseText

          try {
            if (dataType == 'script')    (1,eval)(result)
            else if (dataType == 'xml')  result = xhr.responseXML
            else if (dataType == 'json') result = blankRE.test(result) ? null : JSON.parse(result)
          } catch (e) { error = e }

          if (error) ajaxError(error, 'parsererror', xhr, settings)
          else ajaxSuccess(result, xhr, settings)
        } else {
          ajaxError(null, 'error', xhr, settings)
        }
      }
    }

    var async = 'async' in settings ? settings.async : true
    xhr.open(settings.type, settings.url, async)

    for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

    if (ajaxBeforeSend(xhr, settings) === false) {
      xhr.abort()
      return false
    }

    if (settings.timeout > 0) abortTimeout = setTimeout(function(){
        xhr.onreadystatechange = empty
        xhr.abort()
        ajaxError(null, 'timeout', xhr, settings)
      }, settings.timeout)

    // avoid sending empty string (#319)
    xhr.send(settings.data ? settings.data : null)
    return xhr
  }

  $.get = function(url, success){ return $.ajax({ url: url, success: success }) }

  $.post = function(url, data, success, dataType){
    if ($.isFunction(data)) dataType = dataType || success, success = data, data = null
    return $.ajax({ type: 'POST', url: url, data: data, success: success, dataType: dataType })
  }

  $.getJSON = function(url, success){
    return $.ajax({ url: url, success: success, dataType: 'json' })
  }

  $.fn.load = function(url, success){
    if (!this.length) return this
    var self = this, parts = url.split(/\s/), selector
    if (parts.length > 1) url = parts[0], selector = parts[1]
    $.get(url, function(response){
      self.html(selector ?
        $(document.createElement('div')).html(response.replace(rscript, "")).find(selector).html()
        : response)
      success && success.call(self)
    })
    return this
  }

  var escape = encodeURIComponent

  function serialize(params, obj, traditional, scope){
    var array = $.isArray(obj)
    $.each(obj, function(key, value) {
      if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
      // handle data in serializeArray() format
      if (!scope && array) params.add(value.name, value.value)
      // recurse into nested objects
      else if (traditional ? $.isArray(value) : isObject(value))
        serialize(params, value, traditional, key)
      else params.add(key, value)
    })
  }

  $.param = function(obj, traditional){
    var params = []
    params.add = function(k, v){ this.push(escape(k) + '=' + escape(v)) }
    serialize(params, obj, traditional)
    return params.join('&').replace('%20', '+')
  }
})(Zepto)
;(function ($) {
  $.fn.serializeArray = function () {
    var result = [], el
    $( Array.prototype.slice.call(this.get(0).elements) ).each(function () {
      el = $(this)
      var type = el.attr('type')
      if (this.nodeName.toLowerCase() != 'fieldset' &&
        !this.disabled && type != 'submit' && type != 'reset' && type != 'button' &&
        ((type != 'radio' && type != 'checkbox') || this.checked))
        result.push({
          name: el.attr('name'),
          value: el.val()
        })
    })
    return result
  }

  $.fn.serialize = function () {
    var result = []
    this.serializeArray().forEach(function (elm) {
      result.push( encodeURIComponent(elm.name) + '=' + encodeURIComponent(elm.value) )
    })
    return result.join('&')
  }

  $.fn.submit = function (callback) {
    if (callback) this.bind('submit', callback)
    else if (this.length) {
      var event = $.Event('submit')
      this.eq(0).trigger(event)
      if (!event.defaultPrevented) this.get(0).submit()
    }
    return this
  }

})(Zepto)
;(function($){
  var touch = {}, touchTimeout

  function parentIfText(node){
    return 'tagName' in node ? node : node.parentNode
  }

  function swipeDirection(x1, x2, y1, y2){
    var xDelta = Math.abs(x1 - x2), yDelta = Math.abs(y1 - y2)
    return xDelta >= yDelta ? (x1 - x2 > 0 ? 'Left' : 'Right') : (y1 - y2 > 0 ? 'Up' : 'Down')
  }

  var longTapDelay = 750, longTapTimeout

  function longTap(){
    longTapTimeout = null
    if (touch.last) {
      touch.el.trigger('longTap')
      touch = {}
    }
  }

  function cancelLongTap(){
    if (longTapTimeout) clearTimeout(longTapTimeout)
    longTapTimeout = null
  }

  $(document).ready(function(){
    var now, delta

    $(document.body).bind('touchstart', function(e){
      now = Date.now()
      delta = now - (touch.last || now)
      touch.el = $(parentIfText(e.touches[0].target))
      touchTimeout && clearTimeout(touchTimeout)
      touch.x1 = e.touches[0].pageX
      touch.y1 = e.touches[0].pageY
      if (delta > 0 && delta <= 250) touch.isDoubleTap = true
      touch.last = now
      longTapTimeout = setTimeout(longTap, longTapDelay)
    }).bind('touchmove', function(e){
      cancelLongTap()
      touch.x2 = e.touches[0].pageX
      touch.y2 = e.touches[0].pageY
    }).bind('touchend', function(e){
       cancelLongTap()

      // double tap (tapped twice within 250ms)
      if (touch.isDoubleTap) {
        touch.el.trigger('doubleTap')
        touch = {}

      // swipe
      } else if ((touch.x2 && Math.abs(touch.x1 - touch.x2) > 30) ||
                 (touch.y2 && Math.abs(touch.y1 - touch.y2) > 30)) {
        touch.el.trigger('swipe') &&
          touch.el.trigger('swipe' + (swipeDirection(touch.x1, touch.x2, touch.y1, touch.y2)))
        touch = {}

      // normal tap
      } else if ('last' in touch) {
        touch.el.trigger('tap')

        touchTimeout = setTimeout(function(){
          touchTimeout = null
          touch.el.trigger('singleTap')
          touch = {}
        }, 250)
      }
    }).bind('touchcancel', function(){
      if (touchTimeout) clearTimeout(touchTimeout)
      if (longTapTimeout) clearTimeout(longTapTimeout)
      longTapTimeout = touchTimeout = null
      touch = {}
    })
  })

  ;['swipe', 'swipeLeft', 'swipeRight', 'swipeUp', 'swipeDown', 'doubleTap', 'tap', 'singleTap', 'longTap'].forEach(function(m){
    $.fn[m] = function(callback){ return this.bind(m, callback) }
  })
})(Zepto)

});

require.define("/projects/zombiekit/coffee/agent-entity.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Agent, AgentEntity, Entity, Point,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Entity = require("./entity");

  Agent = require("./agent");

  Point = require("./point");

  AgentEntity = (function(_super) {

    __extends(AgentEntity, _super);

    function AgentEntity() {
      this.drawDebug = __bind(this.drawDebug, this);
      AgentEntity.__super__.constructor.apply(this, arguments);
      this.agent = new Agent(this.world.map);
      this.shape = this.createShape();
      this.shape.onTick = function() {};
      this.followPath = false;
      this.debugShape = new createjs.Shape(new createjs.Graphics());
    }

    AgentEntity.prototype.drawPoint = function(point, color) {
      return this.debugShape.graphics.setStrokeStyle(3).beginStroke(color).drawCircle((-this.world.tileSize / 2) + (point.x * this.world.tileSize), (-this.world.tileSize / 2) + (point.y * this.world.tileSize), 12);
    };

    AgentEntity.prototype.drawDebug = function(options) {
      var nonCollidablePoints, point, unvisitedPoints, upoint, visitedPoints, _i, _j, _k, _len, _len1, _len2;
      if (options) {
        if (options.unvisitedPoints) {
          unvisitedPoints = options.unvisitedPoints;
          for (_i = 0, _len = unvisitedPoints.length; _i < _len; _i++) {
            upoint = unvisitedPoints[_i];
            this.drawPoint(upoint, createjs.Graphics.getRGB(0, 230, 0, 1));
          }
        }
        if (options.visitedPoints) {
          visitedPoints = options.visitedPoints;
          for (_j = 0, _len1 = visitedPoints.length; _j < _len1; _j++) {
            upoint = visitedPoints[_j];
            this.drawPoint(upoint, createjs.Graphics.getRGB(230, 230, 0, 1));
          }
        }
        if (options.nonCollidablePoints) {
          nonCollidablePoints = options.nonCollidablePoints;
          for (_k = 0, _len2 = nonCollidablePoints.length; _k < _len2; _k++) {
            upoint = nonCollidablePoints[_k];
            this.drawPoint(upoint, createjs.Graphics.getRGB(0, 0, 230, 1));
          }
        }
        if (options.point) {
          point = options.point;
          this.drawPoint(point, createjs.Graphics.getRGB(230, 0, 0, 1));
        }
        this.world.stage.update();
        return true;
      } else {
        this.debugShape.graphics.clear();
        this.world.stage.update();
        return false;
      }
    };

    AgentEntity.prototype.findBestTour = function(args) {
      return this.agent.findBestTour(args, game.debugMode ? this.drawDebug : void 0);
    };

    AgentEntity.prototype.setPath = function(path) {
      this.setPosition(path.points[0]);
      return this.path = path;
    };

    AgentEntity.prototype.executePath = function() {
      return this.followPath = true;
    };

    AgentEntity.prototype.createShape = function() {
      var circle, g;
      g = new createjs.Graphics();
      g.setStrokeStyle(5);
      g.beginStroke(createjs.Graphics.getRGB(0, 0, 0, 1));
      g.drawCircle(-this.world.tileSize / 2, -this.world.tileSize / 2, 15);
      circle = new createjs.Shape(g);
      return circle;
    };

    AgentEntity.prototype.update = function() {
      var newPosition;
      if (this.followPath) {
        newPosition = this.path.nextPoint(this.position);
        if (newPosition.equals(this.position)) {
          this.world.pause();
          return;
        }
        this.position = newPosition;
        this.shape.x = this.position.x * this.world.tileSize;
        return this.shape.y = this.position.y * this.world.tileSize;
      }
    };

    return AgentEntity;

  })(Entity);

  module.exports = AgentEntity;

}).call(this);

});

require.define("/projects/zombiekit/coffee/entity.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Entity;

  Entity = (function() {

    function Entity(world, position) {
      this.world = world;
      this.position = position;
      this.shape = {};
      this.setPosition(this.position);
    }

    Entity.prototype.setPosition = function(position) {
      if (position) {
        this.position = position;
      }
      if (this.shape) {
        this.shape.x = this.position.x * this.world.tileSize;
        return this.shape.y = this.position.y * this.world.tileSize;
      }
    };

    Entity.prototype.destroy = function() {};

    return Entity;

  })();

  module.exports = Entity;

}).call(this);

});

require.define("/projects/zombiekit/coffee/world.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Agent, MapFactory, Q, TiledMapRenderer, World, Zepto,
    __slice = [].slice;

  MapFactory = require("./map-factory");

  Agent = require("./agent");

  TiledMapRenderer = require("./tiled-map-renderer");

  Zepto = require("../lib/zepto");

  Q = require("q");

  World = (function() {

    function World(canvasElement) {
      this.canvasElement = canvasElement;
      this.stage = new createjs.Stage(this.canvasElement);
      this.map = MapFactory.getMap();
      this.entities = [];
      this.tileSize = this.map.data.tileheight;
    }

    World.prototype.init = function() {
      var canvas, ctx,
        _this = this;
      canvas = document.createElement('canvas');
      $(canvas).attr('width', 640);
      $(canvas).attr('height', 640);
      ctx = canvas.getContext("2d");
      return TiledMapRenderer.renderMapToContext(this.map, ctx).then((function(value) {
        var backgroundShape;
        createjs.Ticker.setFPS(World.FPS);
        createjs.Ticker.addListener(_this);
        console.log('Rendered background');
        backgroundShape = new createjs.Shape(new createjs.Graphics().beginBitmapFill(canvas).drawRect(0, 0, 640, 640));
        _this.stage.addChildAt(backgroundShape, 0);
        return _this.stage.update();
      }), (function(error) {
        return console.log('Error rendering map:', error);
      }));
    };

    World.prototype.point = function() {
      var args, _ref;
      args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return (_ref = this.map).findPoint.apply(_ref, args);
    };

    World.prototype.addEntity = function(entity) {
      this.entities.push(entity);
      this.stage.addChild(entity.shape);
      if (entity.debugShape) {
        return this.stage.addChild(entity.debugShape);
      }
    };

    World.prototype.update = function() {
      var entity, _i, _len, _ref, _results;
      _ref = this.entities;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entity = _ref[_i];
        _results.push(entity.update());
      }
      return _results;
    };

    World.prototype.tick = function() {
      this.update();
      return this.stage.update();
    };

    World.prototype.pause = function(value) {
      var val;
      val = value != null ? value : true;
      return createjs.Ticker.setPaused(val);
    };

    World.prototype.reset = function() {
      var entity, _i, _len, _ref;
      _ref = this.entities;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        entity = _ref[_i];
        this.stage.removeChild(entity.shape);
        if (entity.debugShape) {
          this.stage.removeChild(entity.debugShape);
        }
        entity.destroy();
      }
      this.entities = [];
      return this.pause(false);
    };

    World.FPS = 15;

    return World;

  })();

  module.exports = World;

}).call(this);

});

require.define("/projects/zombiekit/coffee/game.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var AgentEntity, Game, World;

  World = require("./world");

  AgentEntity = require("./agent-entity");

  Game = (function() {

    function Game() {
      var _this = this;
      this.world = new World($('#canvas')[0]);
      this.world.init().then((function(value) {}), (function(error) {
        return console.log('Error initializing world', error);
      }));
    }

    Game.prototype.run = function(debug) {
      var path;
      this.world.reset();
      this.agent = new AgentEntity(this.world, this.world.point({
        x: 1,
        y: 1
      }));
      this.world.addEntity(this.agent);
      this.debugMode = debug;
      this.world.pointsOfInterest = [this.world.point(3, 3), this.world.point(7, 4), this.world.point(18, 6), this.world.point(19, 17), this.world.point(8, 17), this.world.point(3, 3)];
      path = this.agent.findBestTour(this.world.pointsOfInterest);
      console.log('Chosen path and cost: ', path, path.cost());
      this.agent.setPath(path);
      return this.agent.executePath();
    };

    return Game;

  })();

  module.exports = Game;

}).call(this);

});

require.define("/projects/zombiekit/coffee/agent.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Agent, Arboreal, Path;

  Arboreal = require("../lib/arboreal");

  Path = require("./path");

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
        if ((ncpoint != null ? ncpoint.collidable : void 0) === false) {
          nonCollidablePoints.push(ncpoint);
        }
      }
      return nonCollidablePoints;
    };

    Agent.prototype.findBestPath = function(originPoint, goalPoint, drawDebug) {
      var bestPoint, bestPointHeuristicValue, bestRoute, currentPoint, key, ncpoints, point, pointHeuristicValue, treeCurrentNode, treeHead, unvisitedPoints, unvisitedPointsMap, upoint, visitedPoints, visitedPointsMap, _i, _j, _len, _len1, _ref;
      if (originPoint.collidable === true || goalPoint.collidable === true) {
        return void 0;
      }
      currentPoint = originPoint;
      currentPoint.visited = true;
      treeHead = treeCurrentNode = new Arboreal(null, currentPoint);
      bestRoute = [];
      if (typeof drawDebug === "function") {
        drawDebug({
          point: currentPoint
        });
      }
      while (!currentPoint.equals(goalPoint)) {
        ncpoints = this.nonCollidablePointsFromPoint(currentPoint);
        if (typeof drawDebug === "function") {
          drawDebug({
            nonCollidablePoints: ncpoints
          });
        }
        for (_i = 0, _len = ncpoints.length; _i < _len; _i++) {
          point = ncpoints[_i];
          treeCurrentNode.appendChild(point);
        }
        unvisitedPointsMap = {};
        visitedPointsMap = {};
        treeHead.traverseDown(function(node) {
          var key;
          key = node.data.x + '.' + node.data.y;
          if (node.data.visited) {
            visitedPointsMap[key] = node.data;
          } else {
            unvisitedPointsMap[key] = node.data;
          }
          return true;
        });
        unvisitedPoints = [];
        for (key in unvisitedPointsMap) {
          upoint = unvisitedPointsMap[key];
          if (!visitedPointsMap[key]) {
            unvisitedPoints.push(upoint);
          }
        }
        if (drawDebug) {
          visitedPoints = [];
          for (key in visitedPointsMap) {
            upoint = visitedPointsMap[key];
            visitedPoints.push(upoint);
          }
          drawDebug({
            visitedPoints: visitedPoints,
            unvisitedPoints: unvisitedPoints
          });
        }
        bestPoint = unvisitedPoints[0];
        bestPointHeuristicValue = this.heuristicValue(bestPoint, goalPoint, treeHead);
        _ref = unvisitedPoints.slice(1);
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          point = _ref[_j];
          pointHeuristicValue = this.heuristicValue(point, goalPoint, treeHead);
          if (pointHeuristicValue < bestPointHeuristicValue) {
            bestPoint = point;
            bestPointHeuristicValue = pointHeuristicValue;
          }
        }
        if (typeof drawDebug === "function") {
          drawDebug({
            point: bestPoint
          });
        }
        currentPoint = bestPoint;
        currentPoint.visited = true;
        treeCurrentNode = treeHead.find(function(node) {
          return node.data === currentPoint;
        });
      }
      while (treeCurrentNode) {
        bestRoute.push(treeCurrentNode != null ? treeCurrentNode.data : void 0);
        treeCurrentNode = treeCurrentNode.parent;
      }
      if (typeof drawDebug === "function") {
        drawDebug();
      }
      bestRoute.reverse();
      return new Path(bestRoute);
    };

    Agent.prototype.heuristicValue = function(point, goalPoint, treeHead) {
      return (this.distanceToPoint(point, goalPoint) * 10) + this.pathCost(point, treeHead);
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

    Agent.prototype.findBestTour = function(points, drawDebug) {
      var array, i, key, path, paths, permutations, point, reversePath, tour, tpath, _i, _j, _len, _len1;
      console.log('Finding best tour...');
      console.log(points);
      permutations = this.permutationsTwoByTwo(points);
      paths = {};
      for (_i = 0, _len = permutations.length; _i < _len; _i++) {
        array = permutations[_i];
        path = this.findBestPath(array[0], array[1], drawDebug);
        paths[path.key()] = path;
        reversePath = new Path(path.points).reverse();
        paths[reversePath.key()] = reversePath;
      }
      console.log(paths);
      tour = new Path([]);
      for (i = _j = 0, _len1 = points.length; _j < _len1; i = ++_j) {
        point = points[i];
        tpath = new Path(points.slice(i, (i + 1) + 1 || 9e9));
        key = tpath.key();
        if (i < points.length - 1) {
          tour.addPath(paths[key]);
        }
      }
      console.log('Best tour found.');
      return tour;
    };

    Agent.prototype.permutationsTwoByTwo = function(arr) {
      var res, results, value, _i, _len, _ref;
      if (arr.length === 0) {
        return [];
      }
      results = [];
      _ref = arr.slice(1);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        value = _ref[_i];
        if (arr[0].equals(value)) {
          continue;
        }
        res = [arr[0], value];
        results.push(res);
      }
      return results.concat(this.permutationsTwoByTwo(arr.slice(1)));
    };

    return Agent;

  })();

  module.exports = Agent;

}).call(this);

});

require.define("/projects/zombiekit/coffee/main.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var Game;

  Game = require("./game");

  $(function() {
    window.game = new Game();
    $('#run').click(function() {
      return game.run(false);
    });
    return $('#debug').click(function() {
      return game.run(true);
    });
  });

}).call(this);

});
require("/projects/zombiekit/coffee/main.coffee");
})();
