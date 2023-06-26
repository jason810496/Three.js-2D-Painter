let gridSize = 64;
let cellSize = 10;
let brushSize = 1;
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let grid = [];
let tool = 'brush';
let startX, startY;
let dragging = false;



function setup() {
    createCanvas(gridSize * cellSize + 100, gridSize * cellSize);


    let eraserBtn = createButton('橡皮擦');
    eraserBtn.position(width - 700, height - 500);
    eraserBtn.mousePressed(function() {
        tool = 'eraser';
    });
    let brushBtn = createButton('筆刷');
    brushBtn.position(width - 700, height - 550);
    brushBtn.mousePressed(function() {
        tool = 'brush';
    });

    let lineBtn = createButton('線條');
    lineBtn.position(width - 700, height - 450);
    lineBtn.mousePressed(function() {
        tool = 'line';
    });

    let rectBtn = createButton('矩形');
    rectBtn.position(width - 700, height - 400);
    rectBtn.mousePressed(function() {
        tool = 'rect';
    });

    let clearBtn = createButton('清空');
    clearBtn.position(width - 700, height - 350);
    clearBtn.mousePressed(function() {
        clearGrid();
    });

    let smallBrushBtn = createButton('Small Brush');
    smallBrushBtn.position(width - 700, height - 25);
    smallBrushBtn.mousePressed(function() {
        brushSize = 1;
    });

    let mediumBrushBtn = createButton('Medium Brush');
    mediumBrushBtn.position(width - 550, height - 25);
    mediumBrushBtn.mousePressed(function() {
        brushSize = 2;
    });

    let largeBrushBtn = createButton('Large Brush');
    largeBrushBtn.position(width - 400, height - 25);
    largeBrushBtn.mousePressed(function() {
        brushSize = 3;
    });

    for (let i = 0; i < gridSize; i++) {
        grid.push([]);
        for (let j = 0; j < gridSize; j++) {
            grid[i].push(0);
        }
    }
}

function draw() {

    let zoomedWidth = gridSize * cellSize * zoomLevel + 100;
    let zoomedHeight = gridSize * cellSize * zoomLevel;

    scale(zoomLevel);
    translate(panX, panY);

    background(255);

    if (mouseButton === LEFT) {
        noFill();
        stroke(0);
        strokeWeight(1);
        if (brushSize === 1) {
            rect(mouseX / zoomLevel, mouseY / zoomLevel, cellSize, cellSize);
        } else if (brushSize === 2) {
            rect((mouseX - cellSize) / zoomLevel, (mouseY - cellSize) / zoomLevel, cellSize * 2, cellSize * 2);
        } else if (brushSize === 3) {
            rect((mouseX - cellSize) / zoomLevel, (mouseY - cellSize) / zoomLevel, cellSize * 3, cellSize * 3);
        }
    }

    stroke(200);
    for (let i = 0; i <= gridSize; i++) {
        line(i * cellSize, 0, i * cellSize, height);
        line(0, i * cellSize, width - 100, i * cellSize);
    }

    if (mouseIsPressed && mouseButton === LEFT) {
        if (tool === 'brush') {} else if (tool === 'line' && startX != null && startY != null) {
            noStroke();
            fill(200);

            let x1 = round(startX / cellSize / zoomLevel);
            let y1 = round(startY / cellSize / zoomLevel);
            let x2 = round(mouseX / cellSize / zoomLevel);
            let y2 = round(mouseY / cellSize / zoomLevel);
            let dx = abs(x2 - x1);
            let dy = abs(y2 - y1);
            let sx = x1 < x2 ? 1 : -1;
            let sy = y1 < y2 ? 1 : -1;
            let err = dx - dy;
            let curX = x1;
            let curY = y1;
            while (true) {
                for (let offsetX = 0; offsetX < brushSize; offsetX++) {
                    for (let offsetY = 0; offsetY < brushSize; offsetY++) {
                        rect((curX + 0.5 + offsetX) * cellSize * zoomLevel / zoomLevel, (curY + 0.5 + offsetY) * cellSize * zoomLevel / zoomLevel, cellSize * zoomLevel / zoomLevel, cellSize * zoomLevel / zoomLevel);

                    }
                }
                if (curX === x2 && curY === y2) {
                    break;
                }
                let e2 = 2 * err;
                if (e2 > -dy) {
                    err -= dy;
                    curX += sx;
                }
                if (e2 < dx) {
                    err += dx;
                    curY += sy;
                }
            }
        } else if (tool === 'rect' && startX != null && startY != null) {
            // 瀏覽矩形
            noStroke();
            fill(200);
            let x1 = round(startX / cellSize / zoomLevel);
            let y1 = round(startY / cellSize / zoomLevel);
            let x2 = round(mouseX / cellSize / zoomLevel);
            let y2 = round(mouseY / cellSize / zoomLevel);
            let xMin = min(x1, x2);
            let yMin = min(y1, y2);
            let xMax = max(x1, x2);
            let yMax = max(y1, y2);
            for (let i = xMin; i <= xMax; i++) {
                for (let j = yMin; j <= yMax; j++) {
                    for (let offsetX = 0; offsetX < brushSize; offsetX++) {
                        for (let offsetY = 0; offsetY < brushSize; offsetY++) {
                            rect((i + 0.5 + offsetX) * cellSize, (j + 0.5 + offsetY) * cellSize, cellSize, cellSize);
                        }
                    }
                }
            }
        }
    }

    // 像素
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[i][j] === 1) {
                noStroke();
                fill(0);
                rect(i * cellSize, j * cellSize, cellSize, cellSize);
            }
        }
    }

    if (mouseIsPressed) {
        let i = floor(mouseX / (cellSize * zoomLevel));
        let j = floor(mouseY / (cellSize * zoomLevel));

        if (i >= 0 && i < gridSize && j >= 0 && j < gridSize) {
            if (tool === 'brush' && mouseButton === LEFT) {
                drawPixels(i, j);
            } else if (tool === 'eraser' && mouseButton === LEFT) {
                erasePixels(i, j);
            }
        }
    }

    function clearGrid() {
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                grid[i][j] = 0;
            }
        }
    }
    scale(1 / zoomLevel);
}

function drawPixels(i, j) {

    let startI = i - floor(brushSize / 2);
    let startJ = j - floor(brushSize / 2);
    let endI = startI + brushSize;
    let endJ = startJ + brushSize;
    for (let x = startI; x < endI; x++) {
        for (let y = startJ; y < endJ; y++) {
            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                grid[x][y] = 1;
            }
        }
    }
}

function erasePixels(i, j) {
    let startI = i - floor(brushSize / 2);
    let startJ = j - floor(brushSize / 2);
    let endI = startI + brushSize;
    let endJ = startJ + brushSize;
    for (let x = startI; x < endI; x++) {
        for (let y = startJ; y < endJ; y++) {
            if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                grid[x][y] = 0;
            }
        }
    }
}

function mouseWheel(event) {

    if (event.deltaY > 0) {
        zoomLevel = max(zoomLevel - 0.1, 0.1);
    } else {
        zoomLevel = min(zoomLevel + 0.1, 2);
    }
}

function keyPressed() {
    if (key === ' ') {
        clearGrid();
    }
}

function mousePressed() {
    if (mouseButton === RIGHT) {
        dragging = true;
    }
    if (tool === 'line') {
        startX = round(mouseX / cellSize / zoomLevel) * cellSize * zoomLevel + cellSize / 2;
        startY = round(mouseY / cellSize / zoomLevel) * cellSize * zoomLevel + cellSize / 2;


    } else if (tool === 'rect') {
        startX = mouseX;
        startY = mouseY;
    }
    if (mouseButton === RIGHT) {
        isPanning = true;
    }
}

function mouseReleased() {
    isPanning = false;
    let i = floor(mouseX / cellSize / zoomLevel);
    let j = floor(mouseY / cellSize / zoomLevel);
    if (tool === 'line') {
        stroke(0);
        strokeWeight(1);
        let x1 = round((startX - cellSize / 2) / cellSize / zoomLevel);
        let y1 = round((startY - cellSize / 2) / cellSize / zoomLevel);
        let x2 = round((mouseX - cellSize / 2) / cellSize / zoomLevel);
        let y2 = round((mouseY - cellSize / 2) / cellSize / zoomLevel);
        drawThickLine(x1, y1, x2, y2, brushSize);
        startX = null;
        startY = null;

    } else if (tool === 'rect') {
        stroke(0);
        strokeWeight(1);
        let x1 = round(startX / cellSize / zoomLevel);
        let y1 = round(startY / cellSize / zoomLevel);
        let x2 = round(mouseX / cellSize / zoomLevel);
        let y2 = round(mouseY / cellSize / zoomLevel);
        startX = min(x1, x2) * cellSize * zoomLevel;
        startY = min(y1, y2) * cellSize * zoomLevel;
        let endX = max(x1, x2) * cellSize * zoomLevel;
        let endY = max(y1, y2) * cellSize * zoomLevel;
        for (let i = startX; i <= endX; i += cellSize * zoomLevel) {
            for (let j = startY; j <= endY; j += cellSize * zoomLevel) {
                drawPixels(round(i / cellSize / zoomLevel), round(j / cellSize / zoomLevel));
            }
        }
        startX = null;
        startY = null;
    }
}


function drawThickLine(x1, y1, x2, y2, thickness) {
    let dx = abs(x2 - x1);
    let dy = abs(y2 - y1);
    let sx = x1 < x2 ? 1 : -1;
    let sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    while (true) {

        drawPixels(x1, y1);
        if (x1 === x2 && y1 === y2) {
            break;
        }
        let e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y1 += sy;
        }
    }
}

function clearGrid() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            grid[i][j] = 0;
        }
    }
}

function mouseDragged() {
    if (isPanning) {
        panX += (mouseX - pmouseX) / zoomLevel;
        panY += (mouseY - pmouseY) / zoomLevel;
    }
}