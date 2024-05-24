
var initialCenter = []; 
const initialZoom = 15;
const map = L.map('map').setView([20.8378667, 106.6952169], initialZoom); // ĐHHH lat,lon
const markerLayer = L.layerGroup().addTo(map); // Lưu trữ các marker
const startPlaceLayer = L.layerGroup().addTo(map); // Lưu trữ các marker của startPlace
const endPlaceLayer = L.layerGroup().addTo(map); // Lưu trữ các marker của endPlace
var startPlaceSelected = false;
var endPlaceSelected = false;
var moveBySelected = false;
var moveByMethod ='';
// Định nghĩa phạm vi bounds
var minLat = 20.830416;
var minLon = 106.662569;
var maxLat = 20.853518;
var maxLon = 106.704111;
var bounds = [[minLat, minLon], [maxLat, maxLon]];
const MoveBy = document.querySelector('#move-by');
const startPlace = document.getElementById('start-place');
const startPlaceMessage = document.querySelector('#start-place-message');
const endPlace = document.getElementById('end-place');
const endPlaceMessage = document.querySelector('#end-place-message');
const moveByMessage = document.querySelector('#move-by-message');
const result = document.querySelector('#result');
// Thêm tile layer từ OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    minZoom: 14, // Zoom tối thiểu
    maxZoom: 19, // Zoom tối đa
    // bounds: bounds, // Sử dụng biến bounds
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Tạo marker tại tọa độ trung tâm
var redIcon = L.icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Tạo một đường biên với các điểm tạo nên vùng giới hạn
const boundaryPoints = [
    [minLat, minLon], // Góc dưới bên trái
    [minLat, maxLon], // Góc dưới bên phải
    [maxLat, maxLon], // Góc trên bên phải
    [maxLat, minLon], // Góc trên bên trái
    [minLat, minLon]  // Trở lại góc dưới bên trái để đóng vòng
];

// Tạo đường biên từ các điểm trên
const boundary = L.polygon(boundaryPoints, {
    color: 'red',      // Màu đường biên
    weight: 2,         // Độ dày của đường biên
    fillOpacity: 0.0,  // Độ trong suốt của màu nền (0 là hoàn toàn trong suốt)
}).addTo(map);
//hàm kiểm tra nếu người dùng trong thành phố hải phòng
function isInHaiphong(latitude, longitude) {
    // Phạm vi vĩ độ và kinh độ của thành phố Hải Phòng
    const haiphongBounds = {
        minLat: minLat,
        maxLat: maxLat,
        minLon: minLon,
        maxLon: maxLon
    };

    // Kiểm tra nếu vị trí nằm trong phạm vi thành phố Hải Phòng
    if (latitude >= haiphongBounds.minLat && latitude <= haiphongBounds.maxLat &&
        longitude >= haiphongBounds.minLon && longitude <= haiphongBounds.maxLon) {
        return true; // Nằm trong thành phố Hải Phòng
    } else {
        return false; // Không nằm trong thành phố Hải Phòng
    }
}
var myLat = 0;
var myLon = 0;
const options = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
};
function handle_errors(error){
        switch(error.code)
        {
            case error.PERMISSION_DENIED: alert("user did not share geolocation data");
            break;

            case error.POSITION_UNAVAILABLE: alert("could not detect current position");
            break;

            case error.TIMEOUT: alert("retrieving position timed out");
            break;

            default: alert("unknown error");
            break;
        }
    }    

function showLocation() {
    if (navigator&&navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            myLat = position.coords.latitude;
            myLon = position.coords.longitude;
            console.log('test',myLat,myLon);
            //  Kiểm tra nếu vị trí của người dùng không nằm trong vùng dữ liệu
            if (!isInHaiphong(myLat, myLon)) {
                alert("Ứng dụng chỉ hỗ trợ trong vùng phạm vi dữ liệu đường màu đỏ ");
                return;
            }
            initialCenter = [myLat,myLon]; // Cập nhật initialCenter khi có kết quả từ getCurrentPosition
            map.setView(initialCenter, initialZoom);
            // Kiểm tra xem marker hiện tại đã được tạo chưa
            if (typeof currentLocationMarker === 'undefined') {
                // Tạo marker nếu chưa có
                currentLocationMarker = L.marker([myLat,myLon]).addTo(map);
                currentLocationMarker.bindPopup("Vị trí hiện tại của bạn").openPopup();
            } else {
                // Di chuyển marker đến vị trí mới
                currentLocationMarker.setLatLng([myLat,myLon]);
            }
            console.log('initialCenter trong showLocation:', initialCenter); // In ra initialCenter sau khi cập nhật
        });
    } else {
        alert("Trình duyệt của bạn không hỗ trợ định vị.");
    }
}
// Hàm để xóa tất cả các đường thẳng trên bản đồ
function removePolylines() {
    map.eachLayer(function(layer) {
        if (layer instanceof L.Polyline) {
            if (layer !== boundary) {
                map.removeLayer(layer);
            }
        }
    });
}

// Hàm chon phương tiện đi lại
function moveby(value){
    moveByMethod = value;
    moveBySelected = true;
    moveByMessage.classList.add('d-none');
}
let startPlacefocused =false;
let endPlacefocused = false;
let startPlaceMarker = null;
let endPlaceMarker = null;

function clearEndPlace() {
    if (endPlaceMarker) {
        map.removeLayer(endPlaceMarker); // Nếu đã tồn tại, loại bỏ marker cũ
    }
    endPlace.value = ''; // Xóa giá trị của endPlace input
    selectedMarkerLat = null; 
    selectedMarkerLon = null;
    endPlaceSelected = false;
}
function clearStartPlace() {
    if (startPlaceMarker) {
        map.removeLayer(startPlaceMarker); // Nếu đã tồn tại, loại bỏ marker cũ
    }
    startPlace.value = ''; // Xóa giá trị của endPlace input
    initialCenter = []; 
    startPlaceSelected = false;
}

// hàm chọn địa điểm xuất phát
startPlace.addEventListener('input', function(){
    const query = this.value;
    if (query.length > 2) {
      fetch(`/place-search?q=${query}`)
        .then(response => response.json())
        .then(data => {
            console.log('data',data);
          const suggestions = document.getElementById('start-place-suggestions');
          suggestions.innerHTML = '';
          data.forEach(place => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.textContent = place.tags.name;
            console.log()
            div.onclick = () => {
              removePolylines();
            //   markerLayer.clearLayers();
              startPlaceLayer.clearLayers(); // Xóa các marker của startPlace
              document.getElementById('start-place').value = place.tags.name;
              suggestions.innerHTML = '';
              initialCenter = [place.lat, place.lon]; 
              if (endPlaceMarker && endPlaceMarker.getLatLng().equals([place.lat, place.lon])) {
                // Nếu trùng nhau, không thêm marker mới cho điểm đến
                alert('Điểm đến không thể trùng với điểm bắt đầu!');
                clearStartPlace();
                return;
              }
              // Kiểm tra xem startPlaceMarker đã được khởi tạo hay chưa
              if (startPlaceMarker) {
                map.removeLayer(startPlaceMarker); // Nếu đã tồn tại, loại bỏ marker cũ
              }
              startPlaceMarker = L.marker(initialCenter, { icon: redIcon }).addTo(startPlaceLayer);
              startPlaceMarker.bindPopup(`<b>${place.tags.name}</b>`).openPopup();
              map.setView(initialCenter, initialZoom);
              startPlaceSelected = true;
              if (startPlaceSelected) {
                startPlaceMessage.classList.add('d-none');
              }
            };
            suggestions.appendChild(div);
          });
        });
    } else {
      document.getElementById('start-place-suggestions').innerHTML = '';
    }
});
endPlace.addEventListener('input', function(){
    const query = this.value;
    if (query.length > 2) {
      fetch(`/place-search?q=${query}`)
        .then(response => response.json())
        .then(data => {
            console.log('data',data);
            const suggestions = document.getElementById('end-place-suggestions');
            suggestions.innerHTML = '';
            data.forEach(place => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = place.tags.name;
                console.log()
                div.onclick = () => {
                    removePolylines();
                    // markerLayer.clearLayers();
                    endPlaceLayer.clearLayers(); // Xóa các marker của endPlace
                    document.getElementById('end-place').value = place.tags.name;
                    suggestions.innerHTML = '';
                    selectedMarkerLat = place.lat;
                    selectedMarkerLon = place.lon;
                   // Kiểm tra xem điểm bắt đầu và điểm đến có trùng nhau không
                    if (startPlaceMarker && startPlaceMarker.getLatLng().equals([selectedMarkerLat, selectedMarkerLon])) {
                        // Nếu trùng nhau, không thêm marker mới cho điểm đến
                        alert('Điểm đến không thể trùng với điểm bắt đầu!');
                        clearEndPlace();
                        return;
                    }
                    if (endPlaceMarker) {
                        map.removeLayer(endPlaceMarker); // Nếu đã tồn tại, loại bỏ marker cũ
                    }
                    endPlaceMarker = L.marker([selectedMarkerLat, selectedMarkerLon]).addTo(endPlaceLayer);
                    endPlaceMarker.bindPopup(`<b>${place.tags.name}</b>`).openPopup();
                    map.setView([selectedMarkerLat,selectedMarkerLon], initialZoom);
                    endPlaceSelected = true;
                    if (endPlaceSelected) {
                        endPlaceMessage.classList.add('d-none');
                    }
                };
            suggestions.appendChild(div);
          });
        });
    } else {
      document.getElementById('start-place-suggestions').innerHTML = '';
    }
});

// Hàm chọn điểm xuất phát
// function start_place(value) {
//     removePolylines();
//     markerLayer.clearLayers();
//     if (value && value === "current-place") {
//         // Gọi hàm hiển thị vị trí
//         showLocation();
//         startPlaceSelected = true; // Đã chọn điểm xuất phát
//     } else if (value && value === "DHHH") {
//         initialCenter = [20.8378667, 106.6952169]; // DHHH lat,lon
//         var marker = L.marker(initialCenter, { icon: redIcon }).addTo(map);
//         marker.bindPopup("<b>Đại Học Hàng Hải</b>").openPopup(); // Hiển thị marker ĐHHH
//         map.setView(initialCenter, initialZoom);
//         console.log('initialCenter khi chọn ĐHHH:', initialCenter); // In ra initialCenter sau khi chọn ĐHHH
//         startPlaceSelected = true; // Đã chọn điểm xuất phát
//     }
//     if (startPlaceSelected) {
//         startPlaceMessage.classList.add('d-none');
//     }
// }

console.log('initialCenter', initialCenter);
// tạo các marker cho loại điểm đến
let selectedMarkerLon = null;
let selectedMarkerLat = null;
function addMarkerToMap(map, layer, name, lon, lat) {
    const marker = L.marker([lat, lon]).addTo(layer);
    marker.bindPopup(name, { autoClose: false }).openPopup();
    marker.on('click', (e) => {
        endPlace.value = name;
        selectedMarkerLon = lon;
        selectedMarkerLat = lat;
        console.log('Name:', name);
        console.log('Latitude:', selectedMarkerLat);
        console.log('Longitude:', selectedMarkerLon);
        endPlaceSelected = true;
        endPlaceMessage.classList.add('d-none');
    });
}

// Tạo biến global để lưu trữ tọa độ khi người dùng click vào bản đồ
let clickedLatLng = null;
function onMapClick(e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    if (!isInHaiphong(lat, lon)) {
        alert("Ứng dụng chỉ hỗ trợ trong vùng phạm vi dữ liệu đường màu đỏ ");
        return;
    }
    removePolylines();
    // Kiểm tra nơi nào đang được focus và thực hiện các hành động tương ứng
    if (startPlacefocused) {
        initialCenter = [lat, lon]; 
        startPlace.value = `${lat},${lon}`;
        startPlaceSelected = true;
        startPlaceMessage.classList.add('d-none');
        if (startPlaceMarker) {
            map.removeLayer(startPlaceMarker);
        }
        startPlaceMarker = L.marker([lat, lon], { icon: redIcon });
        startPlaceMarker.addTo(startPlaceLayer);
    } else if (endPlacefocused) {
        selectedMarkerLon = lon;
        selectedMarkerLat = lat;
        endPlace.value = `${lat},${lon}`;
        endPlaceSelected = true;
        endPlaceMessage.classList.add('d-none');
        if (endPlaceMarker) {
            map.removeLayer(endPlaceMarker);
        }
        endPlaceMarker = L.marker([lat, lon]);
        endPlaceMarker.addTo(endPlaceLayer);
    }
}

// Thêm sự kiện "click" vào bản đồ và gọi hàm xử lý khi click
map.on('click', onMapClick);
// Định nghĩa hàm xử lý khi focus vào start place
function onStartPlaceFocus() {
    startPlacefocused = true;
    endPlacefocused = false;
    console.log('Start place is focused');
}

// Định nghĩa hàm xử lý khi focus vào end place
function onEndPlaceFocus() {
    endPlacefocused = true;
    startPlacefocused = false;
    console.log('End place is focused');
}

// Thêm sự kiện "focus" vào start place và gọi hàm xử lý khi focus
startPlace.addEventListener('focus', onStartPlaceFocus);

// Thêm sự kiện "focus" vào end place và gọi hàm xử lý khi focus
endPlace.addEventListener('focus', onEndPlaceFocus);

// Tìm và hiển thị các marker theo loại điểm đến trên bản đồ
async function end_placetype_search(value) {
    console.log("Selected end place:", value);
    try {
        const response = await fetch(`http://localhost:3000/search-end-place?type=${value}`);
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        console.log('Search result:', data);
        // Xóa tất cả các marker hiện có trên bản đồ
        markerLayer.clearLayers();
        removePolylines();
        // Thêm marker cho mỗi kết quả trả về
        data.forEach(place => {
            if (place.tags.name !== null) {
                addMarkerToMap(map, markerLayer, place.tags.name, place.lon, place.lat);
            }
        });
        // Giữ màn hình ở vị trí khởi tạo
        if (initialCenter.length > 0) {
            map.setView(initialCenter, initialZoom);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Tìm đường đi ngắn nhất
const searchButton = document.querySelector('#search');
searchButton.addEventListener('click', async () => {
    console.log('Tôi là Search đây:');
    console.log('selectedMarkerLon:', selectedMarkerLon);
    console.log('selectedMarkerLat:', selectedMarkerLat);
    console.log('initialCenter[0]:', initialCenter[0]);
    console.log('initialCenter[1]:', initialCenter[1]);
    const startLon = initialCenter[1];
    const startLat = initialCenter[0];
    const endLon = selectedMarkerLon;
    const endLat = selectedMarkerLat;
    const moveby = moveByMethod;
    const dataIncord = { startLon, startLat, endLon, endLat, moveby };
    console.log('dataIncord:', dataIncord);
    // Kiểm tra xem đã chọn điểm xuất phát hay chưa
    if(!moveBySelected) {
        moveByMessage.classList.remove('d-none');
        return;
    }
    else if (!startPlaceSelected) {
        startPlaceMessage.classList.remove('d-none');
        return;
    }
    else if(!endPlaceSelected) {
        endPlaceMessage.classList.remove('d-none');
        return;
    }

    // Kiểm tra xem đã có marker nào được chọn chưa
    if (selectedMarkerLon !== null && selectedMarkerLat !== null) {
        // Gửi các giá trị lon và lat của điểm bắt đâu và điểm kết thúc cho server
        try {
        const response = await fetch('/search-shortest-way', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataIncord)
        });
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        console.log('Response from server:', data);
        if (data.coordinatesArray.length ===0) {
            if(moveby ==='foot'){
                result.innerHTML = 'Kết quả: không có đường đi bộ';
                removePolylines();
                if(!result.classList.contains('error-message')){
                    result.classList.add('error-message');
                }
            }
            else if(moveby ==='motorcycle'){
                result.innerHTML = 'Kết quả: không có đường đi xe máy';
                removePolylines();
                if(!result.classList.contains('error-message')){
                    result.classList.add('error-message');
                }
            }
            else if(moveby ==='motorcar'){
                result.innerHTML = 'Kết quả: không có đường đi xe ô tô';
                removePolylines();
                if(!result.classList.contains('error-message')){
                    result.classList.add('error-message');
                }
            }
        } else {
            const latlngs = data.coordinatesArray;
            // Xóa tất cả các lớp trên bản đồ
            removePolylines();
            L.polyline(latlngs, {
                color: 'blue', // Màu sắc của đoạn thẳng
                weight: 5, // Độ dày của đoạn thẳng
                opacity: 0.8, // Độ mờ của đoạn thẳng
                // dashArray: '10, 10' // Độ đứt của đoạn thẳng (nếu muốn)
            }).addTo(map);
            // Mảng chứa các điểm đầu và cuối cùng của đường mới
            const newLineCoordsStart = [
                { lat: initialCenter[0], lon: initialCenter[1] }, // Điểm ban đầu
                { lat: data.coordinatesArray[0].lat, lon: data.coordinatesArray[0].lon }, // Điểm gần nhất của đường polyline
            ];
            L.polyline(newLineCoordsStart, {
                color: 'blue', // Màu sắc của đoạn thẳng
                weight: 5, // Độ dày của đoạn thẳng
                opacity: 0.6, // Độ mờ của đoạn thẳng
                dashArray: '10, 10' // Độ đứt của đoạn thẳng (nếu muốn)
            }).addTo(map);                    
            const newLineCoordsEnd = [
                { lat: data.coordinatesArray[data.coordinatesArray.length - 1].lat, lon: data.coordinatesArray[data.coordinatesArray.length - 1].lon }, // Điểm cuối cùng của đường polyline
                { lat: selectedMarkerLat, lon: selectedMarkerLon } // Điểm kết thúc
            ];
            L.polyline(newLineCoordsEnd, {
                color: 'blue', // Màu sắc của đoạn thẳng
                weight: 5, // Độ dày của đoạn thẳng
                opacity: 0.6, // Độ mờ của đoạn thẳng
                dashArray: '10, 10' // Độ đứt của đoạn thẳng (nếu muốn)
            }).addTo(map); 
            if(result.classList.contains('error-message')){
                result.classList.remove('error-message');
                result.innerHTML = 'Kết quả: <span style="color: #007bff; font-weight: bold;">' + data.totalPathDistance.toFixed(2) + '</span> km';
            }  
            result.innerHTML = 'Kết quả: <span style="color: #007bff; font-weight: bold;">' + data.totalPathDistance.toFixed(2) + '</span> km';
        }
    } catch (error) {
        console.error('Error:', error);
    }
    } else {
        console.error('No marker selected');
    }
});
