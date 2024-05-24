const express = require('express');
const data = require('./data.json');
const fs = require('fs');
const Fuse = require('fuse.js');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// tìm loại điểm đến
// app.get('/search-end-place', (req, res) => {
//     const { type } = req.query;
//     try {
//         // Lọc dữ liệu từ tệp JSON dựa trên loại
//         const filteredData = data.places.filter(item => {
//             // Kiểm tra xem item tồn tại và có thuộc tính amenity không
//             if (item && item.tags && item.tags.amenity) {
//                 // Nếu có, kiểm tra xem amenity của item có phù hợp với loại đã chỉ định
//                 if (item.tags.amenity === type) {
//                     // Trả về tất cả các thuộc tính của item
//                     return item;
//                 }
//             }
//         });
//         res.json(filteredData);
//     } catch (error) {
//         console.error('Error:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });


// Lọc dữ liệu chỉ giữ lại các node có tags.name
const filteredNodes = data.places.filter(item => item.type === 'node' && item.tags && item.tags.name);
// Cấu hình Fuse.js cho tìm kiếm
const fuse = new Fuse(filteredNodes, {
    keys: ['tags.name'],
    threshold: 0.3
  });
// Endpoint để tìm kiếm địa điểm
app.get('/place-search', (req, res) => {
    const { q } = req.query;
    if (!q) {
      return res.status(400).send({ error: 'Query parameter "q" is required' });
    }
  
    const results = fuse.search(q).map(result => result.item);
    res.send(results);
  });
  
// Khởi tạo biến graph bên ngoài phần xử lý tìm kiếm đường ngắn nhất
let graph = {};
function createGraphFromData(data) {
    const graph = {};

    // Thêm nút vào đồ thị
    data.places.forEach(place => {
        if (place.type === 'way') {
            graph[place.id] = [];
        }
    });
    // Thêm các đoạn đường vào đồ thị
    data.places.forEach(place => {
        if (place.type === 'way' && place.nodes && place.nodes.length > 1) {
            const wayNodes = place.nodes;
            for (let i = 0; i < wayNodes.length - 1; i++) {
                const startNodeId = wayNodes[i];
                const endNodeId = wayNodes[i + 1];
    
                const startNodeCoord = getNodeCoordinates(startNodeId); // Truy xuất thông tin tọa độ của nút bắt đầu
                const endNodeCoord = getNodeCoordinates(endNodeId); // Truy xuất thông tin tọa độ của nút kết thúc
    
                // Kiểm tra xem cả hai tọa độ tồn tại trước khi thêm vào đồ thị
                if (startNodeCoord && endNodeCoord) {
                    // Kiểm tra xem startNode.id đã tồn tại trong graph chưa
                    if (!graph[startNodeId]) {
                        graph[startNodeId] = [];
                    }  
                    // Kiểm tra xem endNode.id đã tồn tại trong graph chưa
                    if (!graph[endNodeId]) {
                        graph[endNodeId] = [];
                    }
                    const distance = calculateDistance(startNodeCoord.lat, startNodeCoord.lon, endNodeCoord.lat, endNodeCoord.lon);
                    if (distance) {
                        if(place.tags.oneway ==='yes' ){
                            if(!place.tags.foot ||place.tags.foot ==='yes'){                             
                                if(place.tags.motorcycle==='no' ){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, oneway: true, motorcycle: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, oneway: true, motorcycle: false });
                                }
                                else if(place.tags.motorcar==='no') {
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, oneway: true, motorcar: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, oneway: true, motorcar: false });
                                }
                                else if(place.tags.motorcycle==='no' && place.tags.motorcar==='no'){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, oneway: true, motorcar: false, motorcycle: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, oneway: true, motorcar: false, motorcycle: false });
                                }
                                else if((!place.tags.motorcycle || place.tags.motorcycle==='yes') && (!place.tags.motorcar || place.tags.motorcar==='yes')){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, oneway: true });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, oneway: true, motorcar: false, motorcycle: false });
                                }
                            } else if(place.tags.foot==='no'){
                                if(place.tags.motorcycle==='no' ){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, oneway: true, motorcycle: false });
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, oneway: true, motorcycle: false, motorcar: false });
                                }
                                else if(place.tags.motorcar==='no') {
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, oneway: true, motorcar: false });
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, oneway: true, motorcycle: false, motorcar: false });
                                }
                                else if(place.tags.motorcycle==='no' && place.tags.motorcar==='no'){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, oneway: true, motorcar: false, motorcycle: false });
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, oneway: true, motorcycle: false, motorcar: false });
                                }
                                else if((!place.tags.motorcycle || place.tags.motorcycle==='yes') && (!place.tags.motorcar || place.tags.motorcar==='yes')){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, oneway: true, foot: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, oneway: true, foot: false, motorcar: false, motorcycle: false });
                                }
                            }
                        }
                        else if(!place.tags.oneway || place.tags.oneway ==='no' ){
                            if(!place.tags.foot ||place.tags.foot ==='yes'){
                                if(place.tags.motorcycle==='no' ){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance,  motorcycle: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance,  motorcycle: false });
                                }
                                else if(place.tags.motorcar==='no' ){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, motorcar: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, motorcar: false });
                                }
                                else if(place.tags.motorcycle==='no'  && place.tags.motorcar==='no'){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, motorcar: false, motorcycle: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, motorcar: false, motorcycle: false });     
                                }
                                else if((!place.tags.motorcycle || place.tags.motorcycle==='yes') && (!place.tags.motorcar || place.tags.motorcar==='yes')){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance });
                                }                               
                            }else if(place.tags.foot==='no'){
                                if(place.tags.motorcycle==='no' ){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, motorcycle: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, foot: false, motorcycle: false });
                                }
                                else if(place.tags.motorcar==='no') {
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, motorcar: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, foot: false, motorcar: false });
                                }
                                else if(place.tags.motorcycle==='no' && place.tags.motorcar==='no'){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false, motorcar: false, motorcycle: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, foot: false, motorcar: false, motorcycle: false });
                                }
                                else if((!place.tags.motorcycle || place.tags.motorcycle==='yes') && (!place.tags.motorcar || place.tags.motorcar==='yes')){
                                    graph[startNodeId].push({ node: endNodeId, distance: distance, foot: false });
                                    graph[endNodeId].push({ node: startNodeId, distance: distance, foot: false });
                                }     
                            }
                        }
                    } else {
                        console.log('there no distance');
                    }
                } else {
                    console.log('either startNodeCoord or endNodeCoord is missing');
                }
            }
        }
    });
    Object.keys(graph).forEach(vertex => {
        const neighbors = graph[vertex];
        if (neighbors.length === 0) {
            delete graph[vertex];
        }
    });
    return graph;
}


// Kiểm tra xem tệp JSON tồn tại hay không
const graphFilePath = './graph.json';
if (fs.existsSync(graphFilePath)) {
    graph = JSON.parse(fs.readFileSync(graphFilePath, 'utf8'));
    console.log('Graph file exists and loaded successfully.');
} else {
    graph = createGraphFromData(data);
    // Lưu đồ thị vào tệp JSON
    fs.writeFileSync(graphFilePath, JSON.stringify(graph), 'utf8');
    console.log('Graph file created successfully.');
}

// tính khoảng cách  theo công thức Haversine 
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 && lon1 && lat2 && lon2) {
        // Convert độ sang radian
        const toRadians = degree => degree * (Math.PI / 180);
        // Bán kính trái đất trong đơn vị km
        const R = 6371;
    
        // Chuyển đổi các độ sang radian
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
    
        // Tính công thức Haversine
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
        // Khoảng cách giữa hai điểm
        const distance = R * c;
        
        return distance;
    }
    else {
        console.log('NO lat1,lon1,lat2,lon2');
    }
}


// tìm node id theo lat,lon
function findNodeIdByLatLon(lat, lon, data) {
    let foundNode = null;
    data.places.forEach(point => {
        // Kiểm tra nếu point là node và tính toán khoảng cách
        if (point.type === 'node' && point.lat === lat && point.lon === lon) {
            foundNode = point;
        }
    });
    return foundNode; // Trả về null nếu không tìm thấy node id phù hợp
}


// tìm đường đi ngắn nhất dijkstra
app.post('/search-shortest-way', (req, res) => {
    const { startLon, startLat, endLon, endLat, moveby } = req.body;
    console.log(startLon);
    console.log(startLat);
    console.log(endLon);
    console.log(endLat);
    console.log(moveby);
    // Tìm điểm gần nhất
    const nearestStartPoint = findNearestPoint(startLat, startLon, data);
    console.log('nearestStartPoint',nearestStartPoint);
    const nearestEndPoint = findNearestPoint(endLat, endLon, data);
    console.log('nearestEndPoint:',nearestEndPoint);
    try {
        let arraypath =[];
        if (nearestStartPoint && nearestEndPoint) {
            // Chờ đợi hàm findShortestPath hoàn thành và trả về kết quả          
            arraypath  =  findShortestPathDijkstra(nearestStartPoint, nearestEndPoint, graph, moveby);
            // Khởi tạo mảng để lưu trữ các tọa độ
            if(arraypath){
                const coordinatesArray = [];
                // Duyệt qua mỗi node trong arraypath
                for (const nodeId of arraypath) {
                    // Gọi hàm getNodeCoordinates để lấy tọa độ của node
                    const coordinates = getNodeCoordinates(nodeId);
                    
                    // Nếu tọa độ hợp lệ, thêm vào mảng coordinatesArray
                    if (coordinates) {
                        coordinatesArray.push(coordinates);
                    }
                }
                // console.log(coordinatesArray);
                console.log('Toltal path distance: ',totalPathDistance);
                return res.status(200).json({ 
                    coordinatesArray: coordinatesArray,
                    totalPathDistance: totalPathDistance 
                });
            }
            else if(arraypath.length ===0){
                totalPathDistance = 0;
                return res.status(200).json({ 
                    coordinatesArray: arraypath,
                    totalPathDistance: totalPathDistance 
                });
            }
        } else {
            res.status(404).json({ error: 'No nearest point found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while finding the shortest path' });
    }
});

// Hàm lấy tọa độ của một node từ data.places
function getNodeCoordinates(nodeId) {
    if(nodeId){
        const place = data.places.find(place =>  place.type === 'node' && place.id == nodeId );
        if (place) {
            return { lat: place.lat, lon: place.lon };
        } 
    }
}


// tìm đường ngắn nhất theo thuật toán Dijkstra
const maxDistance = 1000;
var totalPathDistance = 0;
function findShortestPathDijkstra(startNodeId, endNodeId, graph, moveby) {
    console.time("Dijkstra Execution Time");
    let shortestDistance = maxDistance; // Khoảng cách ngắn nhất, khởi tạo với giá trị lớn nhất
    let shortestPath = []; // Đường đi ngắn nhất
    const numberOfVertices = Object.keys(graph).length; // Số lượng đỉnh trong đồ thị
    const visited = Array.from({ length: numberOfVertices }, () => false); // Mảng visited khởi tạo với số lượng đỉnh và giá trị ban đầu là false
    const distances = {}; // Đối tượng lưu trữ khoảng cách từ đỉnh bắt đầu đến các đỉnh khác
    const parents = {}; // Đối tượng lưu trữ đỉnh cha của các đỉnh trong đường đi ngắn nhất
    const queue = []; // Hàng đợi ưu tiên dùng cho thuật toán Dijkstra

    // Hàm kiểm tra hàng đợi có rỗng không
    function isEmpty() {
        return queue.length === 0;
    }

    // Hàm thêm phần tử vào hàng đợi sao cho được sắp xếp theo ưu tiên
    function enqueue(element, priority) {
        let added = false;
        for (let i = 0; i < queue.length; i++) {
            if (priority < queue[i].priority) {
                queue.splice(i, 0, { element, priority });
                added = true;
                break;
            }
        }
        if (!added) {
            queue.push({ element, priority });
        }
    }

    // Hàm lấy ra phần tử đầu tiên của hàng đợi
    function dequeue() {
        return queue.shift();
    }

    // Khởi tạo khoảng cách và hàng đợi ưu tiên
    Object.keys(graph).forEach(vertex => {
        distances[vertex] = maxDistance; // Khởi tạo khoảng cách của mỗi đỉnh là giá trị lớn nhất
        enqueue(vertex, maxDistance); // Thêm mỗi đỉnh vào hàng đợi với ưu tiên là giá trị khoảng cách ban đầu
        parents[vertex] = null; // Khởi tạo đỉnh cha của mỗi đỉnh là null
    });

    // Khởi tạo khoảng cách từ đỉnh bắt đầu là 0
    distances[startNodeId] = 0;
    enqueue(startNodeId, 0);

    // Bắt đầu vòng lặp Dijkstra
    while (!isEmpty()) {
        const shortestVertex = dequeue(); // Lấy đỉnh có khoảng cách nhỏ nhất ra khỏi hàng đợi
        if (!graph[shortestVertex.element]) {
            continue; // Nếu không tìm thấy đỉnh này trong đồ thị, tiếp tục vòng lặp
        }

        if (visited[shortestVertex.element]) {
            continue; // Nếu đỉnh đã được duyệt, bỏ qua
        }

        graph[shortestVertex.element].forEach(neighbor => { // Duyệt qua các đỉnh kề của đỉnh hiện tại
            let canMove = true;
            let weight = neighbor.distance; // Trọng số của cạnh nối với đỉnh kề

            // Kiểm tra có thể di chuyển bằng phương tiện đang xét không
            switch (moveby) {
                case 'foot':
                    if (neighbor.foot === false) canMove = false;
                    break;
                case 'motorcycle':
                    if (neighbor.motorcycle === false) canMove = false;
                    break;
                case 'motorcar':
                    if (neighbor.motorcar === false) canMove = false;
                    break;
                default:
                    break;
            }

            if (canMove) {
                const neighborVertex = neighbor.node;
                let totalDistance = distances[shortestVertex.element] + weight; // Tính tổng khoảng cách

                // Nếu khoảng cách mới nhỏ hơn khoảng cách hiện tại, cập nhật
                if (totalDistance < distances[neighborVertex]) {
                    distances[neighborVertex] = totalDistance;
                    parents[neighborVertex] = shortestVertex.element; // Cập nhật đỉnh cha của đỉnh kề
                    enqueue(neighborVertex, totalDistance); // Thêm đỉnh kề vào hàng đợi với ưu tiên là khoảng cách mới
                    // Nếu đỉnh kề là đỉnh kết thúc, cập nhật khoảng cách ngắn nhất và đường đi ngắn nhất
                    if (neighborVertex == endNodeId) {
                        shortestDistance = totalDistance;
                        totalPathDistance = shortestDistance;
                        let currentVertex = endNodeId;
                        shortestPath = [];
                        // Xây dựng đường đi ngắn nhất từ đỉnh kết thúc về đỉnh bắt đầu
                        while (currentVertex !== null) {
                            shortestPath.unshift(currentVertex);
                            currentVertex = parents[currentVertex];
                        }
                    }
                }
            }
        });

        visited[shortestVertex.element] = true; // Đánh dấu đỉnh đã duyệt
    }

    // In ra khoảng cách ngắn nhất và đường đi ngắn nhất
    if (shortestPath.length > 0) {
        console.log("Total distance:", totalPathDistance);
        console.log("Shortest path found:", shortestPath);
        console.timeEnd("Dijkstra Execution Time");
        return shortestPath;
    } else {
        shortestPath = [];
        console.log("Shortest path not found");
        console.timeEnd("Dijkstra Execution Time");
        return shortestPath;
    }
}


function findShortestPathBellmanFord(startNodeId, endNodeId, graph, moveby) {
    console.time("Bellman-Ford Execution Time");
    const numberOfVertices = Object.keys(graph).length;
    const distances = {};
    const parents = {};

    Object.keys(graph).forEach(vertex => {
        distances[vertex] = maxDistance;
        parents[vertex] = null;
    });

    distances[startNodeId] = 0;

    for (let i = 0; i < numberOfVertices - 1; i++) {
        Object.keys(graph).forEach(u => {
            graph[u].forEach(neighbor => {
                let canMove = true;
                let weight = neighbor.distance;

                switch (moveby) {
                    case 'foot':
                        if (neighbor.foot === false) canMove = false;
                        break;
                    case 'motorcycle':
                        if (neighbor.motorcycle === false) canMove = false;
                        break;
                    case 'motorcar':
                        if (neighbor.motorcar === false) canMove = false;
                        break;
                    default:
                        break;
                }

                if (canMove) {
                    const v = neighbor.node;
                    if (distances[u] + weight < distances[v]) {
                        distances[v] = distances[u] + weight;
                        parents[v] = u;
                    }
                }
            });
        });
    }

    let shortestPath = [];
    let currentVertex = endNodeId;
    totalPathDistance = distances[endNodeId];
    while (currentVertex != null) {
        shortestPath.unshift(parseInt(currentVertex))
        currentVertex = parents[currentVertex];
    }

    if (shortestPath[0] != startNodeId) {
        console.log("Shortest path not found");
        console.timeEnd("Bellman-Ford Execution Time");
        return [];
    }
    console.log("Total distance:", totalPathDistance);
    console.log("Shortest path found:", shortestPath);
    console.timeEnd("Bellman-Ford Execution Time");
    return shortestPath;
}

function findShortestPathFloydWarshall(startNodeId, endNodeId, graph, moveby) {
    console.time("Floyd-Warshall Execution Time");
    const numNodes = Object.keys(graph).length;
    const distance = {}; // Ma trận khoảng cách giữa các cặp đỉnh
    const next = {}; // Ma trận để theo dõi đỉnh tiếp theo trong đường đi ngắn nhất

    // Khởi tạo ma trận khoảng cách và ma trận next ban đầu
    for (let i = 0; i < numNodes; i++) {
        distance[i] = {};
        next[i] = {};
        for (let j = 0; j < numNodes; j++) {
            if (i === j) {
                distance[i][j] = 0; // Khoảng cách từ một đỉnh tới chính nó là 0
                next[i][j] = null; // Không có đỉnh tiếp theo nếu là chính nó
            } else {
                distance[i][j] = Infinity;
                next[i][j] = null;
            }
        }
    }

    // Cập nhật ma trận khoảng cách dựa trên đồ thị và điều kiện moveby
    for (let i = 0; i < numNodes; i++) {
        if (graph[i]) {
            graph[i].forEach(neighbor => {
                let canMove = true;

                // Kiểm tra có thể di chuyển bằng phương tiện đang xét không
                switch (moveby) {
                    case 'foot':
                        if (neighbor.foot === false) canMove = false;
                        break;
                    case 'motorcycle':
                        if (neighbor.motorcycle === false) canMove = false;
                        break;
                    case 'motorcar':
                        if (neighbor.motorcar === false) canMove = false;
                        break;
                    default:
                        break;
                }

                if (canMove) {
                    distance[i][neighbor.node] = neighbor.distance;
                    next[i][neighbor.node] = neighbor.node;
                }
            });
        }
    }

    // Duyệt qua tất cả các đỉnh k để xem xét đỉnh k như một đỉnh trung gian
    for (let k = 0; k < numNodes; k++) {
        for (let i = 0; i < numNodes; i++) {
            for (let j = 0; j < numNodes; j++) {
                if (distance[i][k] + distance[k][j] < distance[i][j]) {
                    distance[i][j] = distance[i][k] + distance[k][j];
                    next[i][j] = next[i][k];
                }
            }
        }
    }
    // Hàm để xây dựng đường đi từ startNodeId đến endNodeId
    function buildPath(start, end) {
        const path = [];
        if (next[start][end] === null) {
            return path; // Không có đường đi
        }
        let current = start;
        while (current !== end) {
            path.push(current);
            current = next[current][end];
        }
        path.push(end);
        return path;
    }

    // Trả về khoảng cách và đường đi từ điểm bắt đầu đến điểm kết thúc
    const shortestPath = buildPath(startNodeId, endNodeId);
    const totalPathDistance = distance[startNodeId][endNodeId];
    console.log('shortestPath', shortestPath);
    console.log('totalPathDistance', totalPathDistance);
    console.timeEnd("Floyd-Warshall Execution Time");
    return shortestPath;
}




// Hàm tính khoảng cách từ một điểm đến một đoạn đường
function distanceToSegment(lat, lon, lat1, lon1, lat2, lon2) {
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const dot = ((lat - lat1) * dLat + (lon - lon1) * dLon) / (dLat * dLat + dLon * dLon);

    let closestLat, closestLon;

    if (dot < 0) {
        closestLat = lat1;
        closestLon = lon1;
    } else if (dot > 1) {
        closestLat = lat2;
        closestLon = lon2;
    } else {
        closestLat = lat1 + dot * dLat;
        closestLon = lon1 + dot * dLon;
    }

    const distanceSquared = (lat - closestLat) * (lat - closestLat) + (lon - closestLon) * (lon - closestLon);
    return Math.sqrt(distanceSquared);
}

function findNearestPoint(lat, lon, data) {
    let minDistance = Infinity;
    let nearestPoint = null;
    let node1 = '';
    let node2 = '';
    let nodeCoords1 = {};
    let nodeCoords2 = {};
    let distance = 0;
    
    data.places.forEach(place => {
        if (place.type === 'way' && place.nodes && place.nodes.length > 1) {
            for (let i = 0; i < place.nodes.length - 1; i++) {
                node1 = place.nodes[i];
                node2 = place.nodes[i + 1];
                nodeCoords1 = getNodeCoordinates(node1);
                nodeCoords2 = getNodeCoordinates(node2);
                
                // Kiểm tra xem nodeCoords1 và nodeCoords2 có giá trị hợp lệ không
                if (nodeCoords1 && nodeCoords2) {
                    // Tính khoảng cách từ điểm (lat, lon) tới đoạn đường (nodeCoords1, nodeCoords2)
                    distance = distanceToSegment(lat, lon, nodeCoords1.lat, nodeCoords1.lon, nodeCoords2.lat, nodeCoords2.lon);
                    
                    // So sánh và cập nhật điểm gần nhất nếu cần
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestPoint = node1;
                    }
                }
            }
        }
    });
    
    // Trả về điểm gần nhất
    return nearestPoint;
}

//test dijkstra
const graphtest = {
    "0":[{node: 1, distance: 2.5},{node: 2, distance: 2.0,"motorcar": false},{node: 3, distance: 2.1}],
    "1":[{node: 0, distance: 2.5},{node: 4, distance: 1.0,"motorcycle": false}],
    "2":[{node: 0, distance: 2.0,"motorcar": false},{node: 4, distance:0.6},{node: 5, distance: 1.5}],
    "3":[{node: 0, distance: 2.1},{node: 5, distance:2.5}],
    "4":[{node: 1, distance: 1.0, "motorcycle": false},{node: 2, distance:0.6},{node: 6, distance:2.3}],
    "5":[{node: 2, distance: 1.5},{node: 3, distance:2.5},{node: 6, distance:1.9},{node: 7, distance:2.0}],
    "6":[{node: 4, distance: 2.3},{node: 5, distance:1.9},{node: 7, distance:1.8},{node: 8, distance:1.7}],
    "7":[{node: 5, distance: 2.0},{node: 6, distance:1.8},{node: 8, distance:2.0}],
    "8":[{node: 6, distance: 1.7},{node: 7, distance:2.0}]
}

// console.log("Dijkstra:");
// findShortestPathDijkstra(8, 0, graphtest, "motorcar");
// console.log("Bellman-Ford:");
// findShortestPathBellmanFord(8, 0, graphtest, "motorcar");
// console.log("Floyd-Warshall:");
// findShortestPathFloydWarshall(8, 0, graphtest, "motorcar");
app.listen(port, function(error){
    if (error) {
        console.log("Something went wrong");
    }
    console.log("server is running port:  " + port);
})
