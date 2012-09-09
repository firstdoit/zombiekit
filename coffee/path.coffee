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

  nextPoint: (point) ->
    for pathPoint, i in @points
      if pathPoint.equals point
        return @points[i+1] ? @points[i]

## export
module.exports = Path