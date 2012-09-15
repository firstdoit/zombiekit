Entity = require("./entity")
Agent = require("./agent")
Point = require("./point")

class AgentEntity extends Entity
  constructor: ->
    super
    @agent = new Agent(@world.map)
    if game.debugMode
      @agent.drawDebugFunction = @drawDebug
      @agent.endPathFindCallback = @endPathFindCallback
      @debugShape = new createjs.Shape(new createjs.Graphics())

    @shape = @createShape()
    @shape.onTick = ->
      ##console.log 'shape tick'
    @followPath = false
    @timeSpent = 0

  drawPoint: (point, color) ->
    @debugShape
    .graphics
    .setStrokeStyle(3)
    .beginStroke(color)
    .drawCircle( (-@world.tileSize/2) + (point.x * @world.tileSize), (-@world.tileSize/2) + (point.y * @world.tileSize), 12 )

  drawDebug: (options) =>
    if options
      if options.unvisitedPoints
        unvisitedPoints = options.unvisitedPoints
        for upoint in unvisitedPoints
          @drawPoint(upoint, createjs.Graphics.getRGB(0,230,0,1))

      if options.visitedPoints
        visitedPoints = options.visitedPoints
        for upoint in visitedPoints
          @drawPoint(upoint, createjs.Graphics.getRGB(230,230,0,1))

      if options.nonCollidablePoints
        nonCollidablePoints = options.nonCollidablePoints
        for upoint in nonCollidablePoints
          @drawPoint(upoint, createjs.Graphics.getRGB(0,0,230,1))

      if options.point
        point = options.point
        @drawPoint(point, createjs.Graphics.getRGB(230,0,0,1))

      @world.stage.update()
      return true
    else
      @debugShape.graphics.clear()
      @world.stage.update()
      return false

  findBestPathDebug: (originPoint, goalPoint) ->
    @agent.startPathFinding(originPoint, goalPoint)

  findBestTour: (args) -> @agent.findBestTour(args)

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
      @timeSpent += newPosition.cost
      console.log 'Total time spent:', @timeSpent, 'Time spent now:', newPosition.cost
      if newPosition.equals @position
        @followPath = false
        @world.pause()
        return
      @position = newPosition
      @shape.x = @position.x * @world.tileSize
      @shape.y = @position.y * @world.tileSize
    else if game.debugMode
      @agent.update()

  endPathFindCallback: (path) =>
    @setPath(path)
    @executePath()

## export
module.exports = AgentEntity