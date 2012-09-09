MapFactory = require("./map-factory")
Agent = require("./agent")
TiledMapRenderer = require("./tiled-map-renderer")
Q = require("q")

class World
  constructor: (@canvasElement) ->
    @stage = new createjs.Stage(@canvasElement)
    @map = MapFactory.getMap()
    @agent = new Agent(@map)
    @entities = []

  init: ->
    canvas = document.createElement('canvas')
    $(canvas).attr('width', 320)
    $(canvas).attr('height', 320)
    ctx = canvas.getContext("2d")
    TiledMapRenderer.renderMapToContext(@map, ctx)
      .then( (value) =>
        backgroundShape = new createjs.Shape(new createjs.Graphics().beginBitmapFill(canvas).drawRect(0,0,320,320))
        @stage.addChild(backgroundShape)
        @stage.update()
      )

    console.log @agent.findBestPath(@map.findPoint({x:1,y:1}), @map.findPoint({x:3,y:5})).toString()
    console.log @agent.findBestPath(@map.findPoint({x:1,y:1}), @map.findPoint({x:5,y:2})).toString()
    console.log @agent.findBestPath(@map.findPoint({x:1,y:1}), @map.findPoint({x:4,y:4})).toString()

    createjs.Ticker.setFPS(60)
    createjs.Ticker.addListener(this)

  addEntity: (entity) ->

  tick: ->
    @stage.update()

## export
module.exports = World

###g = new createjs.Graphics()
g.setStrokeStyle(5)
g.beginStroke(createjs.Graphics.getRGB(0,0,0,1))
g.drawCircle(0,0, 30)
circle = new createjs.Shape(g)
circle.x = canvas.width / 2
circle.y = canvas.height / 2
stage.addChild(circle)
stage.update()###
