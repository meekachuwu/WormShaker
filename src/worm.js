/*
	ToDo:
	- Declare varibles in config.json
	- Use paperjs for eyes
	- Organize data into objects
	- Make worm class with properties and methods
*/

// Worm Class
class Worm {
	constructor() {
		this.size = size;
		this.floors = floors;
		this.garage = garage;
	}
}

// Config
var restDrag = 0.8;
var numPoints = 8;
var smooth = true;
var rainbow = false;
var blinkDelay = 6000;
var params = {
	mouseTargetEasing: 0.66,
	fillColor: 'black'
};
var size = 1.4;
var thickness = size * 150;
var strokeWeight = size * 50;
var padding = (thickness+strokeWeight)/2; 
var mouthPadding = 2;
var mouthPoints = numPoints-mouthPadding*2;
var stressLimit = 80;
var maxForce = 30;

// Intiate
var mouseDown = false;
var stress = 0;
var hue = 0;
var peaking = false;
var hasPeaked = false;
var paths = [], particles = [], supports = [], supports2 = [], springs = [];

var segmentLength = getSegmentLength();
var mousePos = new Point(view.size.width/2, view.size.height-segmentLength);
var targetMousePos = new Point(view.size.width/2, view.size.height-segmentLength);
var physics = new ParticleSystem(+0.34, -3, 0, restDrag);

// Body
var pathBody = new Path();
pathBody.style = { strokeColor: params.fillColor, strokeWidth: thickness + strokeWeight, strokeCap: 'round' };
paths.push(pathBody);

// Mouth
var pathMouth = new Path();
pathMouth.style = { strokeColor: '#f03', strokeCap: 'round' };
pathMouth.opacity = 0;
paths.push(pathMouth);

// Toungue
var pathTongue = new Path();
pathTongue.style = { strokeColor: '#AB2259', strokeCap: 'round' };
pathTongue.opacity = 0;
paths.push(pathTongue)

// Build
buildBody();
buildMouth();

// Eyes
var eye1Pos = new Point(), eye2Pos = new Point();

var eyeHeight = { s: 1 };

// Blink
var blinkTween1 = new TWEEN.Tween(eyeHeight).to({s:0}, 90).easing(TWEEN.Easing.Exponential.EaseIn);
var blinkTween2 = new TWEEN.Tween(eyeHeight).to({s:1}, 140).easing(TWEEN.Easing.Exponential.EaseIn);
var blinkTween3 = new TWEEN.Tween(eyeHeight).to({s:0}, 60).easing(TWEEN.Easing.Exponential.EaseIn);
var blinkTween4 = new TWEEN.Tween(eyeHeight).to({s:1}, 180).easing(TWEEN.Easing.Exponential.EaseIn);

blinkTween1.chain(blinkTween2);
blinkTween2.chain(blinkTween3);
blinkTween3.chain(blinkTween4);
blinkTween4.chain(blinkTween1);
blinkTween1.delay(blinkDelay);
blinkTween1.start();

// Eye jiggle
var eyeJiggler = new Jiggler(6);
eyeJiggler.k = 4;
eyeJiggler.mass = 5;

// Timeout
if (hint.enabled) { timeout = setTimeout(function() { document.getElementById('shake').style.display = 'block'; }, hint.idleTime); }

// Gravity
setInterval(function() {
	physics.gravity.x = Math.sin(Date.now()/4000)*0.4;
	physics.gravity.y =	Math.sin(Date.now()/6000)*0.4 - 3
	updateAppearance();
	setPositions();
	physics.tick(1.0);
}, 1000/60);

// Follow mouse
function onMouseMove(event) {
	// 
	var angle = Math.atan2(event.point.y - view.size.height, event.point.x - view.size.width/2);
	
	// 
	targetMousePos.x = view.size.width/2 + Math.cos(angle) * segmentLength*3;
	targetMousePos.y = view.size.height + Math.sin(angle) * segmentLength;
}

// Adapt to re-sizeing of canvas
function onResize() {
	segmentLength = getSegmentLength();
	particles[0].position.x = view.size.width/2;
	particles[0].position.y = view.size.height + segmentLength;
	targetMousePos.x = view.size.width/2;
	targetMousePos.y = view.size.height - segmentLength;
	for (var i = 0; i < springs.length; i++) { springs[i].length = segmentLength; }
}

function buildBody() {
	for (i = 0; i < numPoints; i++) {

		var x = view.size.width / 2;
		var y = view.size.height - (i-1)*segmentLength;

		var particle = physics.makeParticle(2.5, x, y, 0);
		var support = physics.makeParticle(1, x, y - segmentLength, 0);
		var support2 = physics.makeParticle(1, x, y + segmentLength, 0);

		if (i > 0) {
			var prevSupport = supports[i-1];
			var prevParticle = particles[i-1];
			physics.makeSpring(particle, prevSupport, 0.6, 0.48, 0);
			physics.makeSpring(prevParticle, support2, 0.3, 0.7, 0);
			springs.push(physics.makeSpring(particle, prevParticle, 0.2, 0.1, segmentLength));
		}
		
		// Make fixed
		if (i < 2) { particle.makeFixed(); }
		support.makeFixed();
		support2.makeFixed();
	
		pathBody.add(new Point());

		particles.push(particle);
		supports.push(support);
		supports2.push(support2);
	}
}

function buildMouth() {
	for (var i = 0; i < mouthPoints; i++) {
		pathMouth.add(new Point());
		if ( i < mouthPoints-2) { pathTongue.add(new Point()); }
	}
}

function setPositions() {
	mousePos.x += (targetMousePos.x - mousePos.x) * params.mouseTargetEasing;
	mousePos.y += (targetMousePos.y - mousePos.y) * params.mouseTargetEasing;

	particles[1].position.x = mousePos.x;
	particles[1].position.y = mousePos.y;

	var targetStress = 0;

	for (var i = 1; i < numPoints; i++) {
		var support = supports[i];
		var curParticle = particles[i];

		curParticle.position.x = clamp(curParticle.position.x, padding, view.size.width-padding);

		var prevParticle = particles[i-1];
		var angle = Math.atan2(curParticle.position.y - prevParticle.position.y, curParticle.position.x - prevParticle.position.x);
		var force = curParticle.force.length();
		if (force > maxForce) { curParticle.force.scale(force / maxForce); force = maxForce; }
		if (i > 1) targetStress += force;

		support.position.x = curParticle.position.x + Math.cos(angle)*segmentLength;
		support.position.y = curParticle.position.y + Math.sin(angle)*segmentLength;

		pathBody.segments[i].angle = angle;

		var support2 = supports2[i];
		support2.position.x = curParticle.position.x + Math.cos(Math.PI + angle)*segmentLength;
		support2.position.y = curParticle.position.y + Math.sin(Math.PI + angle)*segmentLength;
	}
	stress += (targetStress-stress)*0.01;
}


function updateAppearance() {
	if (stress > stressLimit) {	// Peaking
		if (rainbow) {hue++;}
		pathBody.strokeColor = 'hsl('+Math.round(hue)%360+', 100%, 50%)';
		pathMouth.strokeColor = 'hsl('+Math.round(hue)%360+', 100%, 90%)';
		pathTongue.strokeColor = 'hsl('+Math.round(hue)%360+', 100%, 50%)';
	
		pathMouth.strokeWidth = thickness/1.5 + (Math.random()-Math.random())*20;
		pathTongue.strokeWidth = pathMouth.strokeWidth*0.65;
		
		document.body.className = 'fadeIn';
		physics.drag = 0.2;
		pathMouth.opacity = 1;
		pathTongue.opacity = 1;
		eyeJiggler.rest = 17;
	
		peaking = true;
	
		if (hint.enabled) { 
			clearTimeout(timeout);
			document.getElementById('hint').style.display = 'none';
		}
	} else {	// Not Peaking
		pathBody.strokeColor = params.fillColor;
		peaking = false;
		
		if (hasPeaked) {
			document.body.className = 'fadeOut';
			physics.drag = restDrag;
			pathMouth.opacity = 0;
			pathTongue.opacity = 0;
			eyeJiggler.rest = 6;
		}
	}

	hasPeaked = peaking;
}

function updatePaths() {
	for (var i = 0, j, l; i < numPoints; i++) {
		var curParticle = particles[i];
		var prevParticle = particles[i-1];
		var angle = pathBody.segments[i].angle + Math.PI/2;

		pathBody.segments[i].point.x = curParticle.position.x;
		pathBody.segments[i].point.y = curParticle.position.y;

		j = i-mouthPadding+1;
		l = pathMouth.segments.length;

		if (j >= 0 && j < l) {
			pathMouth.segments[j].point.x = curParticle.position.x;
			pathMouth.segments[j].point.y = curParticle.position.y;
			pathMouth.segments[j].point.x += Math.cos(angle)*thickness/6;
			pathMouth.segments[j].point.y += Math.sin(angle)*thickness/10;

			if (pathTongue.segments[j]) {
				pathTongue.segments[j].point.x = pathMouth.segments[j].point.x;
				pathTongue.segments[j].point.y = pathMouth.segments[j].point.y;
				pathTongue.segments[j].point.x -= Math.cos(angle)*(pathMouth.strokeWidth/15);
				pathTongue.segments[j].point.y -= Math.sin(angle)*(pathMouth.strokeWidth/5);
			}
		}
	}

	if (smooth) { paths.forEach(function(item, index) { paths[index].smooth(); }) }
}

function getSegmentLength() { return view.size.height/numPoints * 0.7; }

function clamp(v, lo, hi) {
	if (v < lo) return lo;
	if (v > hi) return hi;
	return v;
}

function circle(ctx, radius) {
	
	// Circle
	ctx.beginPath();
	ctx.arc(0, 0, radius, 0 || 0, 0 || Math.PI*2, true);
	ctx.fill();
}

// Eyes
function drawEyes(ctx) {	// Draw eye
	var segment = pathBody.segments[numPoints - 3];  // Eye placement (How many segments down?)
	var angle = segment.angle + Math.PI/2;

	radius = Math.max(0, eyeJiggler.pos);
	
	
	// Position
	eye1Pos.x = segment.point.x + Math.cos(angle)*thickness/2.4;
	eye1Pos.y = segment.point.y + Math.sin(angle)*thickness/2.4;
	eye2Pos.x = segment.point.x - Math.cos(angle)*thickness/12;
	eye2Pos.y = segment.point.y - Math.sin(angle)*thickness/12;
	
	ctx.fillStyle = 'white';
	
	// Eye 1
	ctx.save();
	ctx.translate(eye1Pos.x, eye1Pos.y);
	ctx.scale(1, peaking ? 1 : eyeHeight.s);
	circle(ctx, radius)
	ctx.restore();
	
	// Eye 2
	ctx.save();
	ctx.translate(eye2Pos.x, eye2Pos.y);
	ctx.scale(peaking ? 1.2 : 1, peaking ? 1.2 : eyeHeight.s);
	circle(ctx, radius);
	ctx.restore();
}

// Run
var _draw = view.draw;
view.draw = function() {
	_draw.call(view);
	//console.log(this);
	drawEyes(view._context);
}

// Run
function onFrame(event) {
	// Update frame
	Jiggler.update();
	TWEEN.update();
	updatePaths();
	
	//drawEyes(view._context);
};