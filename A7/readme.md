本程序在原有solar system的基础上对代码结构进行了优化，并加入本次作业要求：使用两种方法构造小车。

在本次作业中，使用的两种方法为：

1. Parametric Surfaces， 使用bezier surface（作业中车的红色部分，作为车的车顶弧形设计）生成曲面
2. Polygonal Meshes，编写objloader载入obj模型（作业中车的绿色部分，模型从网上加载）

objloader的编写参考《webGL编程指南》的objViewer的架构，在此架构基础上进行补充和修改得到。



lib文件夹中为工程使用到的库文件，obj中存放使用的小车模型，src中存放工程主体代码。运行时请直接使用以下链接打开：



若在本地执行，则需要配置本地服务器环境（最简便的方法是使用vscode，安装live server插件后使用插件运行index.html即可）
