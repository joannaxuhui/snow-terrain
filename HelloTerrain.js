
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;
var sceneTextureCoordBuffer;
//Create a place to store the traingle edges
var tIndexEdgeBuffer;

var rockTexture;


var keysDown = {};
// View parameters
var airSpeed = 0.2;
// degrees per second
var turnSpeed = 35.0;
// keep track of the last time movement was processed, in microseconds
var lastFrame = -1;

var viewDir = vec3.fromValues(0.0,0.0,-1.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

 var orbitMatrix=mat4.create();
 var eyeMatrix=mat4.create(); 
 var meye=[0,0,0];
 var morbit=[0,0,0];
 var orbitRotation=quat.create();
 var eyeRotation=quat.create();
 var rotYaw=0;
 var orbitYaw=0;
 var orbitPitch=0;

  var far  = 2000;
  var near = 0.1;
  var up   = [0, 1, 0];
//-------------------------------------------------------------------------
function handleKeyDown(event) {
  if(event.keyCode == 76)
    useLighting = !useLighting;
  keysDown[event.keyCode] = true;
}

function handleKeyUp(event) {
  keysDown[event.keyCode] = false;
}

function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var gridN=128;
    
    var numT = terrainFromIteration(gridN, -20,20,-20,20, vTerrain, fTerrain, nTerrain);
    console.log(generateTextureCoords(gridN).length);
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();  //vertex
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();  //face
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;

    sceneTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sceneTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generateTextureCoords(gridN)), gl.STATIC_DRAW);
    sceneTextureCoordBuffer.itemSize = 2;
    sceneTextureCoordBuffer.numItems = (gridN+1)*(gridN+1);
    
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length;
      
     mat4.lookAt(mvMatrix, [0, 0,10],[ 0, 0, 0],[ 0, 2, 0]); 

}


function xyToi(x, y, width, skip) {
  return skip * (width * y + x);
}

function generateTextureCoords(side) {
  var coords = [];
  for(var i = 0; i <=side; i++) { // y
    for(var j = 0; j<=side; j++) { // x
      coords[xyToi(j, i, side+1, 2)] = j / side;
      coords[xyToi(j, i, side+1, 2) + 1] = i / side;
      if(coords[xyToi(j, i, side, 2)] < 0.0 || coords[xyToi(j, i, side, 2) + 1] < 0.0)
        console.log("texture coords are hard");
    }
  }
  return coords;
}



//-------------------------------------------------------------------------
function drawTerrain(){
 gl.polygonOffset(0,0);
 

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw
  gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, sceneTextureCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, sceneTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, rockTexture);
  gl.uniform1i(shaderProgram.rockTextureSamplerUniform, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);

  gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT, 0);

}

//-------------------------------------------------------------------------
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 

 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);   


}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
  gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.rockTextureSamplerUniform = gl.getUniformLocation(shaderProgram, "uRockTexture");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------load the texture 
function setupBuffers() {
    setupTerrainBuffers();
}



function setupTextures() {
  
  
  

  rockTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, rockTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([255, 0, 0, 255]));
  var image = new Image();
  
  image.onload = function() {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, rockTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    handleLoadedTexture(image.width,image.height);
  }
  
   image.src = rock.src;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
};

function handleLoadedTexture(width,height) {

  if (isPowerOf2(width) && isPowerOf2(height)){
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);

  }else{
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  
    gl.bindTexture(gl.TEXTURE_2D, null);
  
}

//----------------------------------------------------------------------------------
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    
    // Then generate the lookat matrix and initialize the MV matrix to that view
      
 
    //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-3.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25));     
    setMatrixUniforms();
    
   
    uploadLightsToShader([0,1,1],[1.0,1.0,1.0],[1.0,1.0,1.0],[1.0,1.0,1.0]);
    drawTerrain();
    
    
  
    mvPopMatrix();
  
}

//----------------------------------------------------------------------------------
function animate() {
  var current = new Date().getTime();
  if(lastFrame == -1)
    lastFrame = current;
  // we want the time in seconds for simplicity
  var delta = (current - lastFrame) / 1000.0;
  lastFrame = current;
  var c1 = 0.005;
  var c2 = 1.2;
  var c3=0.01;
  morbit=[1.25, 1.25,0];
  meye=[1.25,0.62,1.25];
  var moveDirection=[0,0,0.1];

  // handle keys here
  if(keysDown[87]) {
    // W, rotate in the negative direction about the x axis
    moveDirection=getEyeForwardVector();
  }

  if(keysDown[83]) {
    // S, rotate in the positive direction about the x axis
    moveDirection=getEyeBackwardVector();
  }

  if(keysDown[65]) {
    // A, rotate left
    moveDirection=getEyeLeftVector();
  }

  if(keysDown[68]) {
    // D, rotate right
    moveDirection=getEyeRightVector();
  }

  if(keysDown[81]) {
    // Q, rotate in the negative direction about the z axis
    
    changeEyeYaw(delta*0.1);
  }

  if(keysDown[69]) {
    // E, rotate in the positive direction about the z axis
    
    changeEyeYaw(-delta*0.1); 

  }
  if (keysDown[82]){
    changeEyePitch(delta*0.1);
  }  // up arrow
  if (keysDown[70]){
    changeEyePitch(-delta*0.1);
  } // down arrow
  if (keysDown[88]){
    changeEyeRoll(delta*0.1);
  }   // left arrow
  if (keysDown[90]){
    changeEyeRoll(-delta*0.1);
  }  // right arrow
    
   
   
   vec3.scale(moveDirection,moveDirection, delta);
   var position=vec3.create();
   vec3.add(position,position,moveDirection);
   mat4.translate(mvMatrix,mvMatrix,position);
   
   }



   function update(){    
    
    
        var eye = vec3.create();
                
        vec3.sub(eye, meye, morbit);
        
        mat4.fromRotationTranslation(orbitMatrix, orbitRotation, morbit);
        mat4.fromRotationTranslation(eyeMatrix,   eyeRotation,   eye);        
        mat4.multiply(mvMatrix, orbitMatrix, eyeMatrix);
   
       }
   

function moveEye(direction, velocity) {
        vec3.scale(direction, direction, velocity);
        vec3.subtract(meye, meye, direction);
       }

function getEyeForwardVector() {
        var q  = eyeRotation;
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];

        var x =     2 * (qx * qz + qw * qy);
        var y =     2 * (qy * qx - qw * qx);
        var z = 1 - 2 * (qx * qx + qy * qy);

        return vec3.fromValues(x, y, z);
    }

function getEyeBackwardVector() {
        var v = getEyeForwardVector();
        vec3.negate(v, v);
        return v;
    }    

function getEyeRightVector() {
        var q  = eyeRotation;
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];

        var x = 1 - 2 * (qy * qy + qz * qz);
        var y =     2 * (qx * qy + qw * qz);
        var z =     2 * (qx * qz - qw * qy);

        return vec3.fromValues(x, y, z);
    }

function getEyeLeftVector() {
        var v = getEyeRightVector();
        vec3.negate(v, v);
        return v;
    }

 function getEyeUpVector() {
        var q  = eyeRotation;
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];

        var x =     2 * (qx * qy - qw * qz);
        var y = 1 - 2 * (qx * qx + qz * qz);
        var z =     2 * (qy * qz + qw * qx);

        return vec3.fromValues(x, y, z);
    }

 function getEyeDownVector() {
        var v = getEyeUpVector();
        vec3.negate(v, v);
        return v;
    }

function moveEyeForward(velocity) {
        var dir   = vec3.fromValues(0, 0, 0);
        var right = getEyeRightVector();
        
        vec3.cross(dir, right, up);
        vec3.normalize(dir, dir);
    
        moveEye(dir, velocity);
    
        
    }

function moveEyeBackward (velocity) {
        var dir   = vec3.fromValues(0, 0, 0);
        var right = getEyeRightVector();
        
        vec3.cross(dir, right, up);
        vec3.normalize(dir, dir);
        vec3.negate(dir, dir);
    
        moveEye(dir, velocity);
        
        
    }   

function moveEyeLeft(velocity) {
        moveEye(getEyeLeftVector(), velocity);
    }

 function moveEyeRight(velocity) {
        moveEye(getEyeRightVector(), velocity);
    }    

  function moveEyeUp(velocity) {
        meye[1] += velocity;
        
    }

   function moveEyeDown (velocity) {
        meye[1] -= velocity;
        
    }
   
   function changeEyeYaw(amount) {    
    var rotYaw = quat.create();    
    quat.setAxisAngle(rotYaw, up, amount);
    quat.multiply(eyeRotation, rotYaw, eyeRotation);
    
    rotYaw += amount;
    update();
}

   function changeEyePitch(amount) {
    quat.rotateX(eyeRotation, eyeRotation, amount);
    quat.normalize(eyeRotation, eyeRotation);
    update();
}
    function changeEyeRoll(amount) { 

    var rotYaw = quat.create();    
    quat.setAxisAngle(rotYaw, [0,0,1], amount);
    quat.multiply(eyeRotation, rotYaw, eyeRotation);
    
    rotYaw += amount;
    update();
}
    

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  setupTextures();
  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.enable(gl.DEPTH_TEST);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

