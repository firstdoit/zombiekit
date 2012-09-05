class Game
  constructor: ->
    @map = MapFactory.getMap()
    @agent = new Agent(@map)

    alert(@agent.nonCollidablePointsFromHere())