//初始化绘制程序，type指明反射类型为镜面反射还是漫反射
function initProgram(type, canvas, gl) {

    cw = canvas.clientWidth;
    ch = canvas.clientHeight;
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    canvas.onmousedown = handleMouseDown;
    canvas.onmouseup = handleMouseUp;
    canvas.onmousemove = handleMouseMove;
    canvas.onmouseout = handleMouseOut;
    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;

    //天空盒着色器
    if(type === "skybox"){
      const vsSource = `
      attribute vec4 aTextureCoord;   //纹理坐标

      uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
      uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置

      varying highp vec3 vTextureCoord;
      
      void main() {
        vec4 pos = uProjectionMatrix * uViewMatrix * aTextureCoord;  //点坐标位置
        gl_Position = pos.xyww; //使其深度始终是w/w = 1,欺骗深度检测使天空盒在深处
        vTextureCoord = aTextureCoord.xyz;
      }
    `;
      const fsSource = `
      varying highp vec3 vTextureCoord;
      
      uniform samplerCube uSampler;

      void main() {
        gl_FragColor = textureCube(uSampler, normalize(vTextureCoord));
      }
    `;
          //初始化着色器程序
      const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

      //收集着色器程序会用到的所有信息
      const programInfo = {
          program: shaderProgram,
          attribLocations: {
              textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),              
          },
          uniformLocations: {
              projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
              viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
              uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
          },
      };
      return {
          canvas: canvas,
          gl: gl,
          programInfo: programInfo,
          type: type,
      }
    }
    //切换着色器，分为有镜面反射和无镜面反射
    else if(type === "specular"){
      //定义顶点着色器
      const vsSource = `
      attribute vec2 aTextureCoord;   //纹理坐标
      attribute vec4 aVertexPosition; //位置属性，用四维向量表示（第四维无意义，用于计算）
      attribute vec4 aVertexNormal; //法向量

      uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
      uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
      uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
      uniform mat4 uNormalMatrix; //模型矩阵的逆转置,用于变换法向量

      varying highp vec2 vTextureCoord;
      varying lowp vec3 vNomral;       //法向量，将法向量传递给片元着色器
      varying lowp vec4 vPosition;
      
      void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;  //点坐标位置
        vTextureCoord = aTextureCoord;
        //点位置变换后的世界坐标
        vPosition = uModelMatrix * aVertexPosition;
        vNomral = normalize(vec3(uNormalMatrix * aVertexNormal));
      }
    `;

      //定义片段着色器
      const fsSource = `
      precision mediump float;

      uniform vec3 uLightColor; //光颜色强度
      uniform vec3 uLightPosition; //光源位置
      uniform vec3 uEyePosition; //视点位置
      uniform vec3 uAmbientLight; // 环境光
      uniform float uRoughness, uFresnel;
      uniform sampler2D uSampler;

      varying highp vec2 vTextureCoord;
      varying lowp vec3 vNomral;
      varying lowp vec4 vPosition;
      

      float cookTorrance(vec3 viewDirection, 
        vec3 lightDirection,
        vec3 vNomral,
        float roughness,
        float fresnel){
          float VdotN = max(dot(viewDirection, vNomral), 0.0);
          float LdotN = max(dot(lightDirection, vNomral), 0.000001);
          vec3 h = normalize(viewDirection + lightDirection);

          //Geometric term, Gb = 2(nh)(nv)/vh, Gc = 2(nh)(nl)/lh, G = min(1, Gb, Gc)
          float NdotH = max(dot(h, vNomral), 0.0);
          float VdotH = max(dot(h, viewDirection), 0.0);
          float LdotH = max(dot(h, lightDirection), 0.0);
          float G = min(1.0, min(2.0 * NdotH * VdotN / VdotH, 2.0 * NdotH * LdotN / LdotH));

          //Distribution term
          float D = exp((NdotH * NdotH - 1.0) / (uRoughness * uRoughness * NdotH * NdotH)) / (3.14159265 * uRoughness * uRoughness * NdotH * NdotH * NdotH * NdotH);

          //Fresnel term
          float F = pow(1.0 - VdotN, uFresnel);

          return max(G * F * D / max(3.14159265 * VdotN * LdotN, 0.000001), 0.0);
      }
      
      void main() {
        vec3 viewDirection = normalize(uEyePosition - vec3(vPosition));
        vec3 lightDirection = normalize(uLightPosition - vec3(vPosition));

        float v_specular = cookTorrance(viewDirection, 
          lightDirection,
          vNomral,
          uRoughness,
          uFresnel
          );
        vec4 vColor = texture2D(uSampler, vTextureCoord);
        // 环境反射光颜色
        vec3 ambient = uAmbientLight * vColor.rgb;
        vec3 specular;
        specular[0] = v_specular;        specular[1] = v_specular;        specular[2] = v_specular;
        //计算cos入射角.当角度大于90,说明光照在背面,赋值为0
        float cosLight = max(dot(lightDirection, vNomral), 0.0);
        //计算漫反射反射光颜色
        vec3 diffuse = normalize(uLightColor) * vColor.rgb * cosLight;

        gl_FragColor = vec4(diffuse + specular + ambient, vColor.a);
      }

    `;
      //初始化着色器程序
      const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

      //收集着色器程序会用到的所有信息
      const programInfo = {
          program: shaderProgram,
          attribLocations: {
              vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
              textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
              vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
              
          },
          uniformLocations: {
              projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
              viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
              modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
              normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
              uLightColor: gl.getUniformLocation(shaderProgram, 'uLightColor'),
              uLightPosition: gl.getUniformLocation(shaderProgram, 'uLightPosition'),
              uEyePosition: gl.getUniformLocation(shaderProgram, 'uEyePosition'),
              uAmbientLight: gl.getUniformLocation(shaderProgram, 'uAmbientLight'),
              uRoughness: gl.getUniformLocation(shaderProgram, 'uRoughness'),
              uFresnel: gl.getUniformLocation(shaderProgram, 'uFresnel'),
              uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
          },
      };
      return {
          canvas: canvas,
          gl: gl,
          programInfo: programInfo,
          type: type,
      }
    }
    else if(type === "diffuse"){
      //定义顶点着色器
      const vsSource = `
      attribute vec2 aTextureCoord;   //纹理坐标
      attribute vec4 aVertexPosition; //位置属性，用四维向量表示（第四维无意义，用于计算）
      attribute vec4 aVertexNormal; //法向量

      uniform mat4 uProjectionMatrix;  //投影矩阵，用于定位投影
      uniform mat4 uViewMatrix;  //视角矩阵，用于定位观察位置
      uniform mat4 uModelMatrix;  //模型矩阵，用于定位模型位置
      uniform mat4 uNormalMatrix; //模型矩阵的逆转置,用于变换法向量

      varying highp vec2 vTextureCoord;
      varying lowp vec3 vNomral;
      varying lowp vec4 vPosition;
      
      void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;  //点坐标位置
        vTextureCoord = aTextureCoord;
        //变化后的坐标 -> 世界坐标
        vPosition = uModelMatrix * aVertexPosition;
        vNomral = normalize(vec3(uNormalMatrix * aVertexNormal));
      }
    `;

      //定义片段着色器
      const fsSource = `
      precision mediump float;

      uniform vec3 uLightColor; //光颜色强度
      uniform vec3 uLightPosition; //光源位置
      uniform vec3 uAmbientLight; // 环境光

      varying highp vec2 vTextureCoord;
      varying lowp vec3 vNomral;
      varying lowp vec4 vPosition;
      
      uniform sampler2D uSampler;

      void main() {
        vec4 vColor = texture2D(uSampler, vTextureCoord);
        vec3 lightDirection = normalize(uLightPosition - vec3(vPosition));
        //计算cos入射角.当角度大于90,说明光照在背面,赋值为0
        float cosLight = max(dot(lightDirection, vNomral), 0.0);
        //计算漫反射反射光颜色
        vec3 diffuse = normalize(uLightColor) * vColor.rgb * cosLight;
        // 环境反射光颜色
        vec3 ambient = uAmbientLight * vColor.rgb;

        gl_FragColor = vec4(diffuse + ambient, vColor.a);
      }
    `;

      //初始化着色器程序
      const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

      //收集着色器程序会用到的所有信息
      const programInfo = {
          program: shaderProgram,
          attribLocations: {
              vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
              textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
              vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
              
          },
          uniformLocations: {
              projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
              viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
              modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
              normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
              uLightColor: gl.getUniformLocation(shaderProgram, 'uLightColor'),
              uLightPosition: gl.getUniformLocation(shaderProgram, 'uLightPosition'),
              uAmbientLight: gl.getUniformLocation(shaderProgram, 'uAmbientLight'),
              uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
          },
      };

      gl.clearColor(0.5, 0.5, 0.5, 1.0);  // Clear to black, fully opaque
      gl.clearDepth(1.0);                 // Clear everything
      gl.enable(gl.DEPTH_TEST);           // Enable depth testing
      gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      return {
          canvas: canvas,
          gl: gl,
          programInfo: programInfo,
          type: type,
      }

    }
}

function initShaderProgram(gl, vsSource, fsSource) {
    //加载顶点着色器、片段着色器
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    //创建着色器程序
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    //链接
    gl.linkProgram(shaderProgram);

    return shaderProgram;
}


var mouseDown = false;
var lastMouseX = 0;
var lastMouseY = 0;
function handleMouseDown(event) {
    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}
function handleMouseUp() {
    mouseDown = false;
}
function handleMouseOut() {
    mouseDown = false;
}
function handleMouseMove(event) {
    if (!mouseDown) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;
    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;
    var radx = 0.0, rady = 0.0;
    const viewRotationMatrix = mat4.create();

    //旋转角度radx，横向拖动时的变化，将其转化到弧度
    radx = -1 * (2 * Math.PI) * deltaX * 0.5 / cw;
    //旋转角度rady，纵向拖动时的变化，将其转化到弧度
    rady = (2 * Math.PI) * deltaY * 0.5 / ch;
    //获取视点，up向量,和目标点三个三维向量确立视角坐标系
    var vec3_eye = vec3.fromValues(eye[0], eye[1], eye[2]);
    var vec3_up = vec3.fromValues(up[0], up[1], up[2]);
    var vec3_target = vec3.fromValues(target[0], target[1], target[2]);
    //求出视线方向
    var vec3_eye2target = vec3.create();
    vec3.subtract(vec3_eye2target, vec3_eye, vec3_target);
    //求出横向旋转的方向，即y方向绕其旋转
    var vec3_rotation_y = vec3.create();
    vec3.cross(vec3_rotation_y, vec3_eye2target, vec3_up);
    var rotation_y = [vec3_rotation_y[0], vec3_rotation_y[1], vec3_rotation_y[2]];
    //x方向绕up旋转，通过rotate变换绕两方向旋转得出变换矩阵
    mat4.rotate(viewRotationMatrix,
        viewRotationMatrix,
        radx,
        up);
    mat4.rotate(viewRotationMatrix,
        viewRotationMatrix,
        rady,
        rotation_y);
    
        //对视点和up向量进行旋转变换
    vec3.transformMat4(vec3_eye, vec3_eye, viewRotationMatrix);
    vec3.transformMat4(vec3_up, vec3_up, viewRotationMatrix);

    eye[0] = vec3_eye[0];eye[1] = vec3_eye[1];eye[2] = vec3_eye[2];
    up[0] = vec3_up[0];up[1] = vec3_up[1];up[2] = vec3_up[2];
    //mat4.lookAt(viewMatrix, eye, target, up);
    lastMouseX = newX;
    lastMouseY = newY;
}

var keysdown = new Array(); //键盘标志位，每个键盘码对应数组的一项

  //键盘按下时，将该键的标志位置1，并调用处理函数
  function handleKeyDown(event){
    keysdown[event.keyCode] = 1;
    handle_keys();
  }
  //键盘抬起时，该键的标志位置0
  function handleKeyUp(event){
    keysdown[event.keyCode] = 0;
  }
  //处理按键响应
  function handle_keys(){

    const viewTranslateMatrix = mat4.create();

    //获取视点，up向量,和目标点三个三维向量确立视角坐标系
    var vec3_eye = vec3.fromValues(eye[0], eye[1], eye[2]);
    var vec3_target = vec3.fromValues(target[0], target[1], target[2]);
    var vec3_up = vec3.fromValues(up[0], up[1], up[2]);
    //求出视线方向
    var vec3_eye2target = vec3.create();
    vec3.subtract(vec3_eye2target, vec3_eye, vec3_target);

    //translateX为横向移动方向，translateY为纵向的移动方向，即up
    var vec3_translate_x = vec3.create();
    var vec3_translate_y = vec3.create();
    vec3.cross(vec3_translate_x, vec3_eye2target, vec3_up);
    vec3.normalize(vec3_translate_x, vec3_translate_x);
    vec3.normalize(vec3_translate_y, vec3_up);
    var translate_x = [0, 0, 0], translate_y = [0, 0, 0];

    //由于视口的y与实际的y的方向是相反的，所以此处的符号与x是相反的
    if(keysdown[65]) //A
      translate_x = [-vec3_translate_x[0] / 10, -vec3_translate_x[1] / 10, -vec3_translate_x[2] / 10];
    if(keysdown[68]) //D
      translate_x = [vec3_translate_x[0] / 10, vec3_translate_x[1] / 10, vec3_translate_x[2] / 10];
    if(keysdown[83]) //S
      translate_y = [vec3_translate_y[0] / 10, vec3_translate_y[1] / 10, vec3_translate_y[2] / 10];
    if(keysdown[87]) //W
      translate_y = [-vec3_translate_y[0] / 10, -vec3_translate_y[1] / 10, -vec3_translate_y[2] / 10];

    //得到平移矩阵
    mat4.translate(viewTranslateMatrix,
                  viewTranslateMatrix,
                  translate_x);
    mat4.translate(viewTranslateMatrix,
                  viewTranslateMatrix,
                  translate_y);
    //对目标点和视点进行平移操作
    vec3.transformMat4(vec3_target, vec3_target, viewTranslateMatrix);
    vec3.transformMat4(vec3_eye, vec3_eye, viewTranslateMatrix);
    target[0] = vec3_target[0]; target[1] = vec3_target[1]; target[2] = vec3_target[2];
    eye[0] = vec3_eye[0]; eye[1] = vec3_eye[1]; eye[2] = vec3_eye[2];
  }


function loadTextures(gl, urls){
  var textures = new Array();
  for(var i = 0; i < urls.length; i++){
    var texture = loadTexture(gl, urls[i]);
    textures.push(texture);
  }
  return textures;
}

function initBuffers(gl, positions, textureCoordinates, texture, texture_index, indices, normals) {
    //初始化一个面的buffer
    // 1.顶点缓冲区
    // Create a buffer for the cube's vertex positions.
    const positionBuffer = gl.createBuffer();
    // Select the positionBuffer as the one to apply buffer
    // operations to from here out
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);


    const textureCoordBuffer = gl.createBuffer();   //创建一个GL缓存区保存每个面的纹理坐标信息
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer); //把这个缓存区绑定到GL
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
        gl.STATIC_DRAW);    //把这个数组里的数据都写到GL缓存区

    // 3.索引缓冲区
    // Build the element array buffer; this specifies the indices
    // into the vertex arrays for each face's vertices.
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    // Now send the element array to GL
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, normalBuffer);
    // Now send the element array to GL
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(normals), gl.STATIC_DRAW);
    
    return {
        position: positionBuffer,
        textureCoord: textureCoordBuffer,
        index: indexBuffer,
        normal: normalBuffer,
        indices: indices,
        texture: texture,
        texture_unit_num: texture_index,

    }
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    // Send the source to the shader object

    gl.shaderSource(shader, source);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

//天空盒buffer，因为纹理坐标与世界坐标是对应的，使用原点到立方体的向量所采样的点即可实现映射，只需要positions信息即可
function initSkybox(Program) {
  var scale = 50;
  const positions = [
          // positions          
          -1.0 * scale,  1.0 * scale, -1.0 * scale,
          -1.0 * scale, -1.0 * scale, -1.0 * scale,
           1.0 * scale, -1.0 * scale, -1.0 * scale,
           1.0 * scale, -1.0 * scale, -1.0 * scale,
           1.0 * scale,  1.0 * scale, -1.0 * scale,
          -1.0 * scale,  1.0 * scale, -1.0 * scale,
      
          -1.0 * scale, -1.0 * scale,  1.0 * scale,
          -1.0 * scale, -1.0 * scale, -1.0 * scale,
          -1.0 * scale,  1.0 * scale, -1.0 * scale,
          -1.0 * scale,  1.0 * scale, -1.0 * scale,
          -1.0 * scale,  1.0 * scale,  1.0 * scale,
          -1.0 * scale, -1.0 * scale,  1.0 * scale,
      
           1.0 * scale, -1.0 * scale, -1.0 * scale,
           1.0 * scale, -1.0 * scale,  1.0 * scale,
           1.0 * scale,  1.0 * scale,  1.0 * scale,
           1.0 * scale,  1.0 * scale,  1.0 * scale,
           1.0 * scale,  1.0 * scale, -1.0 * scale,
           1.0 * scale, -1.0 * scale, -1.0 * scale,
      
          -1.0 * scale, -1.0 * scale,  1.0 * scale,
          -1.0 * scale,  1.0 * scale,  1.0 * scale,
           1.0 * scale,  1.0 * scale,  1.0 * scale,
           1.0 * scale,  1.0 * scale,  1.0 * scale,
           1.0 * scale, -1.0 * scale,  1.0 * scale,
          -1.0 * scale, -1.0 * scale,  1.0 * scale,
      
          -1.0 * scale,  1.0 * scale, -1.0 * scale,
           1.0 * scale,  1.0 * scale, -1.0 * scale,
           1.0 * scale,  1.0 * scale,  1.0 * scale,
           1.0 * scale,  1.0 * scale,  1.0 * scale,
          -1.0 * scale,  1.0 * scale,  1.0 * scale,
          -1.0 * scale,  1.0 * scale, -1.0 * scale,
      
          -1.0 * scale, -1.0 * scale, -1.0 * scale,
          -1.0 * scale, -1.0 * scale,  1.0 * scale,
           1.0 * scale, -1.0 * scale, -1.0 * scale,
           1.0 * scale, -1.0 * scale, -1.0 * scale,
          -1.0 * scale, -1.0 * scale,  1.0 * scale,
           1.0 * scale, -1.0 * scale,  1.0 * scale
  ];

  //在positions中所有点信息已经列齐，index只需按序对应即可
  var indices = new Array();
  for(var i = 0; i < 36; i++)
      indices.push(i);

  const textureCoordBuffer = Program.gl.createBuffer();
  // Select the positionBuffer as the one to apply buffer
  // operations to from here out
  Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, textureCoordBuffer);
  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  Program.gl.bufferData(Program.gl.ARRAY_BUFFER, new Float32Array(positions), Program.gl.STATIC_DRAW);
  
  const indexBuffer = Program.gl.createBuffer();
  Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  // Now send the element array to GL
  Program.gl.bufferData(Program.gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices), Program.gl.STATIC_DRAW);

  return {
      textureCoord: textureCoordBuffer,
      index: indexBuffer,
  }
  
}

//初始化一个球，center为球心，radius为半径，color为球的颜色
function initOneBall(Program, center, radius, texture, texture_index, inverse) {
  var positions = new Array();
  var normals = new Array();
  var textureCoordinates = new Array();
  //按经纬计算点坐标
  for (i = 0; i <= 180; i += 1) {//fai
      for (j = 0; j <= 360; j += 1) {//theata
          positions.push(radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180) + center[0]);
          positions.push(radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180) + center[1]);
          positions.push(radius * Math.cos(Math.PI * i / 180) + center[2]);
          if(inverse){
              normals.push(-radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180));
              normals.push(-radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180));
              normals.push(-radius * Math.cos(Math.PI * i / 180));    
          }
          else{
              normals.push(radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180));
              normals.push(radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180));
              normals.push(radius * Math.cos(Math.PI * i / 180));

          }
          textureCoordinates.push(j / 360, i / 180);
      }
  }


  //按照一点与其相邻两点的顺序压入位置数组的索引
  var indices = new Array();
  for (i = 0; i <= 180; i += 1) {//fai
      for (j = 0; j < 360; j += 1) {//theata
          indices.push(360 * i + j);
          indices.push(360 * i + (j + 1));
          indices.push(360 * (i + 1) + j);
          indices.push(360 * (i + 1) + j + 1);
          indices.push(360 * i + (j + 1));
          indices.push(360 * (i + 1) + j);
      }
  }
  const buffers = initBuffers(Program.gl, positions, textureCoordinates, texture, texture_index, indices, normals);
  return buffers;
}