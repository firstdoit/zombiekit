
###g = new createjs.Graphics()
g.setStrokeStyle(5)
g.beginStroke(createjs.Graphics.getRGB(0,0,0,1))
g.drawCircle(0,0, 30)
circle = new createjs.Shape(g)
circle.x = canvas.width / 2
circle.y = canvas.height / 2
stage.addChild(circle)
stage.update()###

###createjs.Ticker.setFPS(60)
createjs.Ticker.addListener(window)###