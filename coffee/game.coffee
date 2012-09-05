window.Game = class Game
  constructor: ->
    @map = MapFactory.getMap()
    @agent = new Agent(@map)

    alert "[x=" + point.x + ", y=" + point.y + "]" for point in @agent.searchNextPoints()