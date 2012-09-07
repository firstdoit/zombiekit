Point = require("./point")
class Map
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

## export
module.exports = Map