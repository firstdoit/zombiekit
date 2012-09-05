class MapFactory
  getMap: ->
    map = { "height": 10,
    "layers": [
      {
      "data": [1, 2, 2, 2, 2, 2, 6, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 31, 32, 32, 32, 36, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "height": 10,
      "name": "Tile Layer 1",
      "opacity": 1,
      "properties":
        {
        "collidible": "false"
        },
      "type": "tilelayer",
      "visible": true,
      "width": 10,
      "x": 0,
      "y": 0
      }
    ],
    "orientation": "orthogonal",
    "properties":
      {

      },
    "tileheight": 64,
    "tilesets": [
      {
      "firstgid": 1,
      "image": "..\/Downloads\/Industrial-TileSheet.png",
      "imageheight": 1024,
      "imagewidth": 640,
      "margin": 0,
      "name": "8bit1",
      "properties":
        {

        },
      "spacing": 0,
      "tileheight": 64,
      "tilewidth": 64
      }
    ],
    "tilewidth": 64,
    "version": 1,
    "width": 10
    }

    return map