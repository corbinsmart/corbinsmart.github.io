log = console.log
var videos = 'woto melo holes paint-the-walls tube-spin hello-snakes hello-snakes-3d glass-smasher matterhorn wheels leafy unstack ball-vs-shapes dancing-hotdog piston-flip dunk-spin word-bridges'.split(' ')
var hasAudio = 'melo tube-spin glass-smasher leafy dancing-hotdog word-bridges'.split(' ')
var games = 'word-bridges tube-spin dancing-hotdog woto piston-flip'.split(' ')
var protos = videos.filter(e => !games.includes(e))
var gamesHtml = games.map(e => {
	return `<video class='panel game' loop autoplay muted>
				<source src="media/mp4/all/${e}.mp4" type="video/webm">
				TODO: support safari
				Your browser does not support HTML video.
			</video>`
}).join('<br/><br/>') + '<br/>'
protos = 'glass-smasher leafy melo'.split(' ')
var protosHtml = protos.map(e => {
	//return `<video class='panel proto' loop autoplay muted>
				//<source src="media/mp4/all/${e}.mp4" type="video/webm">
				//TODO: support safari
				//Your browser does not support HTML video.
			//</video>`
	return `<video class='panel proto' loop autoplay muted>
				<source src="media/webm/${e}.webm" type="video/webm">
				TODO: support safari
				Your browser does not support HTML video.
			</video>`
}).join('')
var html = gamesHtml + protosHtml 
// function resize() {
// 	if (window.innerWidth < 650) {
// 		document.getElementById('maingames').style.transform = 'scale(0.6)';
// 	}
// 	else if (window.innerWidth < 900) {
// 		document.getElementById('maingames').style.transform = 'scale(0.7)';
// 	}
// 	else {
// 		document.getElementById('maingames').style.transform = 'scale(0.8)';
// 	}
// }
//document.onreadystatechange = (e) => {
  //if (document.readyState != 'complete')
    //return
//window.onload = () => {
  //var topdesc = document.getElementById('topdesc')
  //var origin = new Date(2015, 0, 1)
  //var now = new Date()
  //var delta = now.getUTCFullYear()-origin.getUTCFullYear()
  //var years = 1
  //var dur = 1000
  //var start = -1
  //var t = 0
  //function animate(time) {
    //if (start < 0)
      //start = time
    //t = time - start
    
    //var perc = Math.sin(t/dur * Math.PI * 0.5)
    //years = delta*perc
    ////if (t >= dur)
      ////years = delta
    //topdesc.innerHTML = `Below you'll find a selection of my best work<br>spanning the ${Math.floor(years)} years I've been making games.<br><br>Contact: corbintsmart@gmail.com`


    //if (t < dur)  
      //window.requestAnimationFrame(animate)
  //}
  //window.requestAnimationFrame(animate)

  //console.log(delta)

	////document.body.innerHTML = html
	//// vids = document.querySelectorAll('video')
	//// for (let vid of vids) {
		////vid.playbackRate = .25
		////vid.pause()
		////vid.addEventListener('mouseenter', (evt) => {console.log('play');vid.play()})
		////vid.addEventListener('mouseleave', (evt) => {console.log('pause');vid.pause()})
	//// }
	//// resize()
//}
// window.onresize = resize
