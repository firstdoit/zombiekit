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

## export
module.exports = Path