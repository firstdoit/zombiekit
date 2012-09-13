class Entity
  constructor: (@world, @position) ->
    @shape = {}
    @setPosition(@position)

  setPosition: (position) ->
    @position = position if position
    if @shape
      @shape.x = @position.x * @world.tileSize
      @shape.y = @position.y * @world.tileSize

  destroy: ->

## export
module.exports = Entity