MapFactory = require("./map-factory")
Agent = require("./agent")
TiledMapRenderer = require("./tiled-map-renderer")
Q = require("q")

class World
  constructor: (@canvasElement) ->
    @stage = new createjs.Stage(@canvasElement)
    @map = MapFactory.getMap()
    @entities = []
    @tileSize = @map.data.tileheight

  init: ->
    canvas = document.createElement('canvas')
    $(canvas).attr('width', 640)
    $(canvas).attr('height', 640)
    ctx = canvas.getContext("2d")
    TiledMapRenderer.renderMapToContext(@map, ctx).then(
      ((value) =>
        createjs.Ticker.setFPS( World.FPS )
        createjs.Ticker.addListener(@)
        console.log 'Rendered background'
        backgroundShape = new createjs.Shape(new createjs.Graphics().beginBitmapFill(canvas).drawRect(0,0,640,640))
        @stage.addChildAt(backgroundShape, 0)
        @stage.update()
      ),
      ((error) =>
        console.log 'Error rendering map:', error
      ))

  point: (args...) ->
    @map.findPoint(args...)

  addEntity: (entity) ->
    @entities.push entity
    @stage.addChild entity.shape
    @stage.addChild entity.debugShape if entity.debugShape

  update: ->
    entity.update() for entity in @entities

  tick: ->
    @update()
    @stage.update()

  pause: (value) ->
    val = value ? true
    createjs.Ticker.setPaused(val)

  reset: ->
    for entity in @entities
      @stage.removeChild(entity.shape)
      @stage.removeChild(entity.debugShape) if entity.debugShape
      entity.destroy()

    @entities = []
    @pause(false)

  @FPS = 5


## export
module.exports = World