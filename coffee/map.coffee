window.Map = class Map
  ##static const
  @road = 109

  constructor: (@data) ->

  layer: (name) -> return (layer for layer in @data.layers when layer.name is name)[0]
  pointType: (point, layerName) ->
    layer = if layerName != undefined then @layer(layerName) else @data.layers[0]

    ##Some invalid coordinates. Probably off a border.
    return undefined if point.x < 1 or point.y < 1 or point.x > layer.width or point.y > layer.data.length / layer.width

    ##Find the column, then adjust the line, then resolve to 0 based array
    index = ( (point.y-1) * layer.width + point.x ) - 1;
    return layer.data[index]

window.MapFactory = class MapFactory
  @getMap: ->
    data =
      height: 5
      layers: [
        data: [109, 109, 109, 109, 109, 130, 109, 105, 130, 109, 130, 109, 109, 109, 109, 130, 109, 130, 109, 106, 105, 109, 109, 109, 109]
        height: 5
        name: "layer1"
        opacity: 1
        type: "tilelayer"
        visible: true
        width: 5
        x: 0
        y: 0
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