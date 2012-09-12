Entity = require("./entity")
Agent = require("./agent")
Point = require("./point")

class AgentEntity extends Entity
  constructor: ->
    super
    @agent = new Agent(@world.map)
    @shape = @createShape()
    @shape.onTick = ->
      console.log 'shape tick'
    @followPath = false
    @debugShape = new createjs.Shape(new createjs.Graphics())

  drawDebug: (point) ->
    if point
      console.log 'desenhando...'
      @debugShape
        .graphics
        .setStrokeStyle(3)
        .beginStroke(createjs.Graphics.getRGB(230,0,0,1))
        .drawCircle( (-@world.tileSize/2) + (point.x * @world.tileSize), (-@world.tileSize/2) + (point.y * @world.tileSize), 12 )
      @world.stage.update()
    else
      @debugShape.graphics.clear()
      @world.stage.update()

  findBestTour: (args) -> @agent.findBestTour(args, @drawDebug)

  setPath: (path) ->
    @setPosition(path.points[0])
    @path = path

  executePath: ->
    @followPath = true

  createShape: ->
    g = new createjs.Graphics()
    g.setStrokeStyle(5)
    g.beginStroke(createjs.Graphics.getRGB(0,0,0,1))
    g.drawCircle(-@world.tileSize/2, -@world.tileSize/2, 15)
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