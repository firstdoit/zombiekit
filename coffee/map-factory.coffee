Map = require("./map")
class MapFactory
  @getMap: ->
    data =
      height: 5
      layers: [
        {
          data: [109, 109, 109, 109, 109, 130, 109, 105, 130, 109, 130, 109, 109, 109, 109, 130, 109, 130, 109, 106, 105, 109, 109, 109, 109]
          height: 5
          name: "type"
          opacity: 1
          type: "tilelayer"
          visible: true
          width: 5
          x: 0
          y: 0
        },
        {
          data: [4, 4, 4, 4, 4, -1, 4, -1, -1, 4, -1, 4, 4, 4, 4, -1, 4, -1, 4, -1, -1, 4, 4, 4, 4]
          height: 5
          name: "cost"
          opacity: 1
          type: "tilelayer"
          visible: true
          width: 5
          x: 0
          y: 0
        }
      ]
      orientation: "orthogonal"
      properties: {}
      tileheight: 64
      tilesets: [
        firstgid: 1
        image: "Industrial-TileSheet.png"
        imageheight: 1024
        imagewidth: 640
        margin: 0
        name: "industrial"
        properties: {}
        spacing: 0
        tileheight: 64
        tilewidth: 64
      ]
      tilewidth: 64
      version: 1
      width: 5

    return new Map(data)

## export
module.exports = MapFactory