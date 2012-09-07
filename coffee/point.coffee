class Point
  constructor: (@x, @y, @cost, @type) ->
    @cost = @cost ? 1
    @visited = false

  equals: (point) -> return point.x == @x and point.y == @y and point.cost == @cost and point.type == @type

  toString: -> "(" + @x + "," + @y + ")"

## export
module.exports = Point