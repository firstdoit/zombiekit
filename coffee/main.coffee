Game = require("./game")
TiledMapRenderer = require("./tiled-map-renderer")

Zepto ($) ->
  window.game = new Game()
  canvas = $('#canvas')[0]
  ctx = canvas.getContext("2d")
  stage = new createjs.Stage(canvas)
  TiledMapRenderer.renderMapToContext(window.game.map, ctx)
