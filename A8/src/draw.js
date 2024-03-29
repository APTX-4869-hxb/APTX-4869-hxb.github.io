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
var rotation2 = new Rotation(0, [0,0,1]);
var rotation3 = new Rotation(0, [1,0,1]);
var rotation4 = new Rotation(0, [1,0,0]);
var rotation5 = new Rotation(0, [1,-2,0]);



window.onload = function () {
    //准备webGL的上下文：获取canvas的引用并保存在canvas变量里，并获取webGLRenderingContest并赋值给gl
    //gl会用来引用webGL上下文
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');
    
    //光线的颜色，强度，点光源位置和环境光
    var lightColor = vec3.fromValues(1.0, 1.0, 1.0);
    var ambientLight = vec3.fromValues(0.4, 0.4, 0.4);
    var lightPosition = vec3.fromValues(0, 0, 0);
    show();


    //初始化一个球，center为球心，radius为半径，color为球的颜色
    function initOneBall(Program, center, radius, color) {
        var positions = new Array();
        var normals = new Array();
        //按经纬计算点坐标
        for (i = 0; i <= 180; i += 1) {//fai
            for (j = 0; j <= 360; j += 1) {//theata
                positions.push(radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180) + center[0]);
                positions.push(radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180) + center[1]);
                positions.push(radius * Math.cos(Math.PI * i / 180) + center[2]);
                normals.push(radius * Math.sin(Math.PI * i / 180) * Math.cos(Math.PI * j / 180));
                normals.push(radius * Math.sin(Math.PI * i / 180) * Math.sin(Math.PI * j / 180));
                normals.push(radius * Math.cos(Math.PI * i / 180));
            }
        }
        //压入颜色
        var colors = new Array();
        for (i = 0; i <= 180; i += 1) 
            for (j = 0; j <= 360; j += 1) 
                colors.push(color[0], color[1], color[2], color[3]);
        //按照一点与其相邻两点的顺序压入位置数组的索引
        var indices = new Array();
        for (i = 0; i < 180; i += 1) {//fai
            for (j = 0; j < 360; j += 1) {//theata
                indices.push(360 * i + j);
                indices.push(360 * i + (j + 1));
                indices.push(360 * (i + 1) + j);
                indices.push(360 * (i + 1) + j + 1);
                indices.push(360 * i + (j + 1));
                indices.push(360 * (i + 1) + j);
            }
        }
        const buffers = initBuffers(Program.gl, positions, colors, indices, normals);
        return buffers;
    }

    //绘制函数，传入要绘制的buffer，以及模型矩阵、视角矩阵、投影矩阵
    function draw(Program, buffers, modelMatrix, viewMatrix, projectionMatrix) {
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


        //为webGL设置从缓冲区抽取颜色数据的属性值，将其放入着色器信息
        {
            const numComponents = 4;//每次取出4个数值
            const type = Program.gl.FLOAT;//取出数据为浮点数类型
            const normalize = false;
            const stride = 0;
            const offset = 0;
            Program.gl.bindBuffer(Program.gl.ARRAY_BUFFER, buffers.color);
            Program.gl.vertexAttribPointer(
                Program.programInfo.attribLocations.vertexColor,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            Program.gl.enableVertexAttribArray(
                Program.programInfo.attribLocations.vertexColor);
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
        if(Program.light_type === "specular"){
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
        const Program = initProgram("specular", canvas, gl);
        const Program2 = initProgram("diffuse", canvas, gl);

        //定义四个球的球心，半径和颜色
        var center0 = [0,0,0];
        var center1 = [0.0, 0.0, 0.0];
        var center2 = [2, 0.0, 0.0];
        var center3 = [0.0, 1, 0.0];
        var center4 = [0, 0, 0.0];
        var radius1 = 0.2;
        var radius2 = 0.15;
        var radius3 = 0.15;
        var radius4 = 0.1;
        var color1 = [1, 0, 0, 1.0];//Red
        var color2 = [0, 1, 0, 1.0];//Green
        var color3 = [0, 0, 1, 1.0];//Blue
        var color4 = [1, 1, 0, 1.0];//Yellow

        //初始化四个球的buffer
        const ballbuffer1 = initOneBall(Program, center0, radius1, color1);
        const ballbuffer2 = initOneBall(Program, center0, radius2, color2);
        const ballbuffer3 = initOneBall(Program, center0, radius3, color3);
        const ballbuffer4 = initOneBall(Program2, center0, radius4, color4);

        // var v00 = new Vertex(-1,0,-3);        var v01 = new Vertex(0,1,-3);        var v02 = new Vertex(1.5,3,-3);        var v03 = new Vertex(2.8,0,-3);
        // var v10 = new Vertex(-1,0,-2);        var v11 = new Vertex(0,1,-2);        var v12 = new Vertex(1.5,3,-2);        var v13 = new Vertex(2.8,0,-2);
        // var v20 = new Vertex(-1,0,-1);        var v21 = new Vertex(0,1,-1);        var v22 = new Vertex(1.5,3,-1);        var v23 = new Vertex(2.8,0,-1);
        // var v30 = new Vertex(-1,0,0);        var v31 = new Vertex(0,1,0);        var v32 = new Vertex(1.5,3,0);        var v33 = new Vertex(2.8,0,0);

        // //bezier曲面的控制点
        // const p = [
        //     [v00, v10, v20, v30],
        //     [v01, v11, v21, v31],
        //     [v02, v12, v22, v32],
        //     [v03, v13, v23, v33]
        // ]
        //const surfacebuffer = initOneBezierSurface(Program, p, 3, 3, color1, 0.19);

        //载入obj模型
        LoadObjFile(Program.gl, '../obj/car.obj', objbuffers, 0.3, false, 0);

        var then = 0;
        // Draw the scene repeatedly
        function render() {
            var center = [0,0,0];
            const projectionMatrix = setProjectionMatrix(Program.gl);
            const viewMatrix = setViewMatrix();


            const modelMatrix1 = setModelMatrix(center1, rotation1);
            const modelMatrix2 = setModelMatrix(center2, rotation2);
            const modelMatrix3 = setModelMatrix(center3, rotation3);
            center = rotateOneArray(center, modelMatrix3);
            trans = center.map(item => item + 0.2);
            trans[0] -= 0.2;
            const modelMatrix4 = setModelMatrix(trans, rotation4, null ,center);
            const modelMatrix5 = setModelMatrix(translation5, rotation5);


            requestAnimationFrame(render);

            draw(Program, ballbuffer1, modelMatrix1, viewMatrix, projectionMatrix);
            draw(Program, ballbuffer2, modelMatrix2, viewMatrix, projectionMatrix);
            draw(Program, ballbuffer3, modelMatrix3, viewMatrix, projectionMatrix);
            draw(Program2, ballbuffer4, modelMatrix4, viewMatrix, projectionMatrix);
            if (objbuffers[0])
               draw(Program2, objbuffers[0], modelMatrix5, viewMatrix, projectionMatrix);


            //旋转
            rotation2.rad += speed;
            rotation3.rad += speed;
            rotation4.rad += speed * 3;
            rotation5.rad += speed;

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