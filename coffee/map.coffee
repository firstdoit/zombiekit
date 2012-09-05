window.Map = class Map
  ##static const
  @road = 109

  constructor: (@data) ->

  layer: (name) -> return (layer for layer in @data.layers when layer.name is name)[0] ? @data.layers[0]

  findPoint: (coords) ->
    ##Some invalid coordinates. Probably off a border.
    return undefined if coords.x < 1 or coords.y < 1 or coords.x > @data.width or coords.y > @layer().data.length / @layer().width

    ##Find the column, then adjust the line, then resolve to 0 based array
    index = ( (coords.y-1) * @data.width + coords.x ) - 1;

    type = @layer('type').data[index]
    cost = @layer('cost').data[index]
    return new Point(coords.x, coords.y, cost, type)

window.Point = class Point
  constructor: (@x, @y, @cost, @type) ->
    @visited = false

window.MapFactory = class MapFactory
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
          data: [1, 1, 12, 3, 4, -1, 3, -1, -1, 9, -1, 4, 4, 4, 4, -1, 4, -1, 4, -1, -1, 4, 4, 4, 4]
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