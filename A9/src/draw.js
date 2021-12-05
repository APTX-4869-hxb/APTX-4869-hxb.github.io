var objbuffers = [];
var eye = [0, 0, 6];
var target = [0, 0, 0];
var up = [0, 2, 0];
var cw = 0.0;
var ch = 0.0;
var speed = 0.01;

var translation5 = [-2, -1, 0];
var translation6 = [-1.72, -0.65, 0];

var Rotation = function(rad, axis) {
    this.rad = rad;
    this.axis = axis;
  }
//各自的旋转度数和旋转轴
var rotation1 = new Rotation(0, [0,0,1]);
var rotation2 = new Rotation(0, [0,1,1]);
var rotation3 = new Rotation(0, [1,0,1]);
var rotation4 = new Rotation(0, [1,0,0]);
var rotation5 = new Rotation(0, [1,-2,0]);
var ballrotation2 = new Rotation(0, [0,0,1]);
var ballrotation3 = new Rotation(0, [1,0,1]);


window.onload = function () {
    //准备webGL的上下文：获取canvas的引用并保存在canvas变量里，并获取webGLRenderingContest并赋值给gl
    //gl会用来引用webGL上下文
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');
    
    //光线的颜色，强度，点光源位置和环境光
    var lightColor = vec3.fromValues(1.0, 1.0, 1.0);
    var sunLight = vec3.fromValues(1.0, 1.0, 1.0);
    var ambientLight = vec3.fromValues(0.6, 0.6, 0.6);
    var lightPosition = vec3.fromValues(0, 0, 0);

    //天空盒对应的纹理，为http://www.cad.zju.edu.cn/home/hwu/cg.html 中提供的环境纹理
    var skybox_urls = [
        "../texture/pavilion_skybox/right.png",
        "../texture/pavilion_skybox/left.png",
        "../texture/pavilion_skybox/up.png",
        "../texture/pavilion_skybox/down.png",
        "../texture/pavilion_skybox/back.png",
        "../texture/pavilion_skybox/front.png",
    ];
    //各星球的纹理
    var urls = [
        "../texture/sun.jpg",
        "../texture/jupiter.jpg",
        "../texture/earth.jpg",
        "../texture/moon.jpg",

    ];
    var skybox = loadSkybox(gl, skybox_urls);
    var textures = loadTextures(gl, urls);
    show();

    //天空盒的绘制部分，其纹理坐标与世界坐标是对应的，所以只需要绑定纹理坐标和index信息
    function drawSkybox(Program, buffer, viewMatrix, projectionMatrix){
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffer.textureCoord);
            Program.gl.vertexAttribPointer(
                Program.programInfo.attribLocations.textureCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.programInfo.attribLocations.textureCoord);
        }
        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffer.index);
        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.programInfo.program);
        //Program.gl.activeTexture(gl.TEXTURE0);
        Program.gl.bindTexture(Program.gl.TEXTURE_CUBE_MAP, skybox);
        // Tell the shader we bound the texture to texture unit 0
        Program.gl.uniform1i(Program.programInfo.uniformLocations.uSampler, 0);
        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = 36;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }
    //绘制函数，传入要绘制的buffer，以及模型矩阵、视角矩阵、投影矩阵
    function draw(Program, buffers, modelMatrix, viewMatrix, projectionMatrix, texture_unit_num, ambientLight) {
        //为webGL设置从缓冲区抽取位置数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.position);
            Program.gl.vertexAttribPointer(
                Program.programInfo.attribLocations.vertexPosition,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.programInfo.attribLocations.vertexPosition);
        }

        //为webGL设置从缓冲区抽取法向量数据的属性值，将其放入着色器信息
        {
            const numComponents = 3;//每次取出3个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.normal);
            Program.gl.vertexAttribPointer(
                Program.programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.programInfo.attribLocations.vertexNormal);
        }


        // Tell WebGL how to pull out the texture coordinates from
        // the texture coordinate buffer into the textureCoord attribute.
        {
            const numComponents = 2;
            const type = gl.FLOAT;
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
            Program.gl.vertexAttribPointer(
                Program.programInfo.attribLocations.textureCoord,
                numComponents,
                type,
                normalize,
                stride,
                offset);
                Program.gl.enableVertexAttribArray(
                Program.programInfo.attribLocations.textureCoord);
        }

        // Tell WebGL which indices to use to index the vertices
        Program.gl.bindBuffer(Program.gl.ELEMENT_ARRAY_BUFFER, buffers.index);

        //webGL使用此程序进行绘制
        Program.gl.useProgram(Program.programInfo.program);

        // 设置着色器的uniform型变量
        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.projectionMatrix,
            false,
            projectionMatrix);
        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.viewMatrix,
            false,
            viewMatrix);
        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.modelMatrix,
            false,
            modelMatrix);
        

        //用于计算新法向量的矩阵
        const normalMatrix = mat4.create();
        mat4.invert(normalMatrix, modelMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        Program.gl.uniformMatrix4fv(
            Program.programInfo.uniformLocations.normalMatrix,
            false,
            normalMatrix);
        Program.gl.uniform3fv(
            Program.programInfo.uniformLocations.uLightColor,
            lightColor);
        Program.gl.uniform3fv(
            Program.programInfo.uniformLocations.uAmbientLight,
            ambientLight);
        Program.gl.uniform3fv(
            Program.programInfo.uniformLocations.uLightPosition,
            lightPosition);
        if(Program.type === "specular"){
            var eyePosition = vec3.fromValues(eye[0], eye[1], eye[2]);
            Program.gl.uniform3fv(
                Program.programInfo.uniformLocations.uEyePosition,
                eyePosition);
            Program.gl.uniform1f(
                Program.programInfo.uniformLocations.uRoughness,
                0.5);            
            Program.gl.uniform1f(
                Program.programInfo.uniformLocations.uFresnel,
                0.48);  
        }
            //使用纹理
        // Tell WebGL we want to affect texture unit
        Program.gl.activeTexture(gl.TEXTURE0 + buffers.texture_unit_num);
        // Bind the texture to texture unit 
        Program.gl.bindTexture(Program.gl.TEXTURE_2D, buffers.texture);
        // Tell the shader we bound the texture to texture unit 0
        Program.gl.uniform1i(Program.programInfo.uniformLocations.uSampler, texture_unit_num);
        {
            const offset = 0;
            const type = Program.gl.UNSIGNED_SHORT;
            const vertexCount = buffers.indices.length;
            //按连续的三角形方式以此按点绘制
            Program.gl.drawElements(Program.gl.TRIANGLES, vertexCount, type, offset);
        }
    }
    //设置模型矩阵，translation为模型的平移，rotation为模型的旋转。modelrotation，center为可选参数，modelrotation用于模型的方向修正，center用于确定环绕旋转的中心
    function setModelMatrix(translation, rotation, modelrotation, center) {

        if(center)
            var rcenter = center.map(item => -item);
        const modelMatrix = mat4.create();
        if(center)
            mat4.translate(modelMatrix,     // destination matrix
                modelMatrix,     // matrix to translate
                center);  // amount to translate
        mat4.rotate(modelMatrix,  // destination matrix
            modelMatrix,  // matrix to rotate
            rotation.rad,     // amount to rotate in radians
            rotation.axis);       // axis to rotate around (Z)
        mat4.translate(modelMatrix,     // destination matrix
            modelMatrix,     // matrix to translate
            translation);  // amount to translate
        if(modelrotation)
            mat4.rotate(modelMatrix,  // destination matrix
                modelMatrix,  // matrix to rotate
                modelrotation.rad,     // amount to rotate in radians
                modelrotation.axis);       // axis to rotate around (Z)
        if(center)
            mat4.translate(modelMatrix,     // destination matrix
                modelMatrix,     // matrix to translate
                rcenter);  // amount to translate
        return modelMatrix;
    }
    //设置视角矩阵，根据视点，目标点和上方向确定视角矩阵
    function setViewMatrix(){
          //设置view坐标系
        const ViewMatrix = mat4.create();
        mat4.lookAt(ViewMatrix, eye, target, up);
        return ViewMatrix;
    }
    //设置投影矩阵，使用透视投影
    function setProjectionMatrix(gl) {
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix,
            fieldOfView,
            aspect,
            zNear,
            zFar);
        return projectionMatrix;
    }

    function show() {
        //const Program = initProgram("specular", canvas, gl);
        const Program = initProgram("diffuse", canvas, gl);
        const skyProgram = initProgram("skybox", canvas, gl);
        //定义四个球的球心，半径和颜色
        var center0 = [0,0,0];
        var center1 = [0.0, 0.0, 0.0];
        var center2 = [2, 0.0, 0.0];
        var center3 = [0.0, 1, 0.0];
        var center4 = [0, 0, 0.0];
        var radius1 = 0.5;
        var radius2 = 0.15;
        var radius3 = 0.15;
        var radius4 = 0.1;
        var color1 = [1, 0, 0, 1.0];//Red
        var color2 = [0, 1, 0, 1.0];//Green
        var color3 = [0, 0, 1, 1.0];//Blue
        var color4 = [1, 1, 0, 1.0];//Yellow

        //初始化四个球的buffer
        const ballbuffer1 = initOneBall(Program, center0, radius1, textures[0], 0);
        const ballbuffer2 = initOneBall(Program, center0, radius2, textures[1], 1);
        const ballbuffer3 = initOneBall(Program, center0, radius3, textures[2], 2);
        const ballbuffer4 = initOneBall(Program, center0, radius4, textures[3], 3);
        const skyboxbuffer = initSkybox(skyProgram);


        //载入obj模型
        //LoadObjFile(Program.gl, '../obj/car.obj', objbuffers, 0.3, false, 0);

        var then = 0;
        // Draw the scene repeatedly
        function render() {
            var center = [0,0,0];
            const projectionMatrix = setProjectionMatrix(Program.gl);
            const viewMatrix = setViewMatrix();


            const modelMatrix1 = setModelMatrix(center1, rotation1);
            const modelMatrix2 = setModelMatrix(center2, rotation2, ballrotation2);
            const modelMatrix3 = setModelMatrix(center3, rotation3, ballrotation3);
            center = rotateOneArray(center, modelMatrix3);
            trans = center.map(item => item + 0.2);
            trans[0] -= 0.2;
            const modelMatrix4 = setModelMatrix(trans, rotation4, null ,center);
            //const modelMatrix5 = setModelMatrix(translation5, rotation5);


            requestAnimationFrame(render);
            drawSkybox(skyProgram, skyboxbuffer, viewMatrix, projectionMatrix);
            draw(Program, ballbuffer1, modelMatrix1, viewMatrix, projectionMatrix, 0, sunLight);
            draw(Program, ballbuffer2, modelMatrix2, viewMatrix, projectionMatrix, 1, ambientLight);
            draw(Program, ballbuffer3, modelMatrix3, viewMatrix, projectionMatrix, 2, ambientLight);
            draw(Program, ballbuffer4, modelMatrix4, viewMatrix, projectionMatrix, 3, ambientLight);
            // if (objbuffers[0])
            //    draw(Program2, objbuffers[0], modelMatrix5, viewMatrix, projectionMatrix);


            //旋转
            rotation1.rad += speed;            
            rotation2.rad += speed;
            rotation3.rad += speed;
            rotation4.rad += speed * 3;
            ballrotation2.rad += speed * 3;
            ballrotation3.rad += speed * 2;
            //rotation5.rad += speed;

        }
        //对一个点进行旋转，旋转程度由modelMatrix决定
        function rotateOneArray(array, modelMatrix){
            var vec4_array = vec4.fromValues(array[0], array[1], array[2], 1);
            vec4.transformMat4(vec4_array, vec4_array, modelMatrix);
            //vec4.transformMat4(center_sphere, center_sphere, projectionMatrix);
            new_array = new Array();
            new_array.push(vec4_array[0], vec4_array[1], vec4_array[2]);
            return new_array;
        }


        requestAnimationFrame(render);
    }

};