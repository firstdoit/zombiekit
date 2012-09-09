Entity = require("./entity")
Agent = require("./agent")
Point = require("./point")

class AgentEntity extends Entity
  constructor: ->
    super
    @agent = new Agent(@world.map)
    @shape = @createShape()
    @shape.x = @position.x * @world.tileSize
    @shape.y = @position.y * @world.tileSize
    @shape.onTick = -> console.log 'shape tick'

  findBestPath: (args...) -> @agent.findBestPath(args[0], args[1])

  planPath: (args...) ->
    @path = @findBestPath args...

  createShape: ->
    g = new createjs.Graphics()
    g.setStrokeStyle(5)
    g.beginStroke(createjs.Graphics.getRGB(0,0,0,1))
    g.drawCircle(-@world.tileSize/2, -@world.tileSize/2, 30)
    circle = new createjs.Shape(g)
    return circle

  update: ->
    if @path
      newPosition = @path.nextPoint(@position)
      if newPosition.equals @position
        @world.pause()
        return
      @position = newPosition
      @shape.x = @position.x * @world.tileSize
      @shape.y = @position.y * @world.tileSize

## export
module.exports = AgentEntity