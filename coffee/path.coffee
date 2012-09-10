Point = require("./point")
class Path
  constructor: (@points) ->

  cost: ->
    sum = 0
    sum = sum + point.cost for point in @points
    return sum

  toString: ->
    string = ""
    string = string + point.toString() + " " for point in @points
    return string

  key: ->
    firstPoint = @points[0]
    lastPoint = @points[@points.length - 1]
    return firstPoint.toString() + lastPoint.toString()

  nextPoint: (point) ->
    for pathPoint, i in @points
      if pathPoint.equals point
        return @points[i+1] ? @points[i]

  reverse: ->
    @points = @points.reverse()
    return @

  ## static
  @keyFromPoints: (twoPoints) ->
    return new Path(twoPoints).key()

## export
module.exports = Path