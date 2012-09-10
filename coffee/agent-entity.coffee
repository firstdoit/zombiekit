Entity = require("./entity")
Agent = require("./agent")
Point = require("./point")

class AgentEntity extends Entity
  constructor: ->
    super
    @agent = new Agent(@world.map)
    @shape = @createShape()
    @shape.onTick = -> console.log 'shape tick'
    @followPath = false

  findBestPath: (args...) -> @agent.findBestPath(args[0], args[1])

  findBestTour: (args) -> @agent.findBestTour(args)

  planPath: (args...) ->
    @setPosition(args[0])
    @path = @findBestPath args...

  executePath: ->
    @followPath = true

  createShape: ->
    g = new createjs.Graphics()
    g.setStrokeStyle(5)
    g.beginStroke(createjs.Graphics.getRGB(0,0,0,1))
    g.drawCircle(-@world.tileSize/2, -@world.tileSize/2, 30)
    circle = new createjs.Shape(g)
    return circle

  update: ->
    if @followPath
      newPosition = @path.nextPoint(@position)
      if newPosition.equals @position
        @world.pause()
        return
      @position = newPosition
      @shape.x = @position.x * @world.tileSize
      @shape.y = @position.y * @world.tileSize

## export
module.exports = AgentEntity