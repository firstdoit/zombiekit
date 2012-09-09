World = require("./world")

class Game
  constructor: ->
    @world = new World($('#canvas')[0])
    @world.init()

## export
module.exports = Game