Game = require("./game")

$( ->
  window.game = new Game()

  $('#run').click( ->
    game.run(false)
  )
  $('#debug').click( ->
    game.run(true)
  )
)
