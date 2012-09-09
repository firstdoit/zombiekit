MapFactory = require("./map-factory")
Agent = require("./agent")
TiledMapRenderer = require("./tiled-map-renderer")
Zepto = require("../lib/zepto")
Q = require("q")

class World
  constructor: (@canvasElement) ->
    @stage = new createjs.Stage(@canvasElement)
    @map = MapFactory.getMap()
    @entities = []
    @tileSize = 64

  init: ->
    canvas = document.createElement('canvas')
    $(canvas).attr('width', 320)
    $(canvas).attr('height', 320)
    ctx = canvas.getContext("2d")
    TiledMapRenderer.renderMapToContext(@map, ctx)
      .then( (value) =>
        backgroundShape = new createjs.Shape(new createjs.Graphics().beginBitmapFill(canvas).drawRect(0,0,320,320))
        @stage.addChildAt(backgroundShape, 0)
        @stage.update()
      )

    createjs.Ticker.setFPS(10)
    createjs.Ticker.addListener(@)

  addEntity: (entity) ->
    @entities.push entity
    @stage.addChild entity.shape

  update: ->
    entity.update() for entity in @entities

  tick: ->
    @update()
    @stage.update()

## export
module.exports = World