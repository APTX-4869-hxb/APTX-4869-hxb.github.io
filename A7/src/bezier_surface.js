//计算bezier曲线上v点的值。p为控制点数组，n为控制点个数-1， s为缩放程度
function BezierCurve(v, p, n, s) {
    var vertex = new Vertex(0, 0, 0);
    //根据bezier曲线公式进行计算
    for(var j = 0; j <= n; j++){
        vertex.x += p[j].x * Bernstein(j, n, v) * s;
        vertex.y += p[j].y * Bernstein(j, n, v) * s;
        vertex.z += p[j].z * Bernstein(j, n, v) * s;
    }
    return vertex;
  }

  //p[m + 1][n + 1]为控制点矩阵；  u,v:面的两参数; s为缩放程度
function BezierSurface(u, v, m, n, p, s){
    var vertex = new Vertex(0, 0, 0);
    for (var i = 0; i <= m; i++) {
        vertex.x += Bernstein(i, m, u) * BezierCurve(v, p[i], n, s).x;
        vertex.y += Bernstein(i, m, u) * BezierCurve(v, p[i], n, s).y;
        vertex.z += Bernstein(i, m, u) * BezierCurve(v, p[i], n, s).z;
    }
      
    return vertex;
}

var f = [];
//计算阶乘
function factorial(n) {
    if (n == 0 || n == 1)
      return 1;
    if (f[n] > 0)
      return f[n];
    return f[n] = factorial(n - 1) * n;
  }
//计算Bernstein系数
function Bernstein(i, n, x) {
    var binomial = factorial(n) / (factorial(i) * factorial(n - i));
    return binomial * Math.pow(x, i) * Math.pow(1 - x, n - i);
}