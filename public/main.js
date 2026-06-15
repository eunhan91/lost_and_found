$('#searchBtn').on('click', performSearch);
$('#keywordInput').on('keypress', function(e) {
    if (e.key === 'Enter') performSearch();
});

async function performSearch() {
    const keyword = $('#keywordInput').val().trim();
    const agencyTarget = $('#agencySelect').val();
    const selectedDate = $('#dateInput').val();
    const rowLimit = parseInt($('#rowLimit').val()) || 10;
    
    if (!keyword) {
        alert('분실하신 물품의 키워드를 입력해 주세요!');
        return;
    }

    /* DOM 조작 5개 (1/5 ~ 5/5) */
    $('#tableBody').html('<tr><td colspan="5" style="text-align: center; color: #2980b9; font-weight: bold; padding: 30px 0;">데이터를 통합 검색 중입니다...</td></tr>'); // 1/5
    $('#keywordInput').css('border-color', '#1abc9c'); // 2/5
    $('#map').css('border-color', '#1abc9c'); // 3/5
    $('#list-section > h2').css('color', '#1abc9c'); // 4/5
    $('#map-section > h2').css('color', '#1abc9c'); // 5/5

    $.when(
        $.get(`/api/police?keyword=${encodeURIComponent(keyword)}`),
        $.get('/api/daegu')
    ).done(function(policeResult, daeguResult) {
        const policeDoc = policeResult[0];
        const daeguDoc = daeguResult[0];
        let mergedList = [];

        if (agencyTarget === 'all' || agencyTarget === 'police') {
            const policeItems = policeDoc.getElementsByTagName("item");
            for (let item of policeItems) {
                const titleNode = item.getElementsByTagName("fdPrdtNm")[0];
                const dateNode = item.getElementsByTagName("fdYmd")[0];
                const placeNode = item.getElementsByTagName("depPlace")[0];

                if (titleNode) {
                    const formattedDate = dateNode ? formatPoliceDate(dateNode.textContent) : "-";
                    
                    if (selectedDate && formattedDate !== "-" && formattedDate < selectedDate) {
                        continue;
                    }

                    mergedList.push({
                        agency: "경찰청",
                        title: titleNode.textContent,
                        date: formattedDate,
                        place: placeNode ? placeNode.textContent : "보관처 미상"
                    });
                }
            }
        }

        if (agencyTarget === 'all' || agencyTarget === 'subway') {
            const daeguItems = daeguDoc.getElementsByTagName("apiData");
            for (let item of daeguItems) {
                const titleNode = item.getElementsByTagName("regTitle")[0];
                if (titleNode && titleNode.textContent.toLowerCase().includes(keyword.toLowerCase())) {
                    const dateNode = item.getElementsByTagName("regPickingDate")[0];
                    const placeNode = item.getElementsByTagName("regKeepingplace")[0];
                    const placeText = placeNode ? placeNode.textContent : "대구 지하철 역사";

                    if (placeText.includes("반환")) {
                        continue;
                    }
                    
                    const formattedDate = dateNode ? dateNode.textContent : "-";

                    if (selectedDate && formattedDate !== "-" && formattedDate < selectedDate) {
                        continue;
                    }

                    mergedList.push({
                        agency: "대구교통공사",
                        title: titleNode.textContent,
                        date: formattedDate,
                        place: placeText
                    });
                }
            }
        }

        mergedList.sort((a, b) => new Date(b.date) - new Date(a.date));
        mergedList = mergedList.slice(0, rowLimit);
        renderTable(mergedList);

    }).fail(function(error) {
        /* 예외 처리: 네트워크 에러 */
        console.error(error);
        $('#tableBody').html('<tr><td colspan="5" style="text-align: center; color: #e74c3c; font-weight: bold; padding: 30px 0;">데이터를 가져오는 중 네트워크 오류가 발생했습니다.</td></tr>');
    });
}

function renderTable(list) {
    const tableBody = $('#tableBody');
    if (list.length === 0) {
        tableBody.html('<tr><td colspan="5" style="text-align: center; color: #7f8c8d; padding: 30px 0;">조회된 통합 유실물 데이터가 없습니다.</td></tr>');
        return;
    }

    tableBody.empty();
    list.forEach(item => {
        const agencyClass = item.agency === '경찰청' ? 'agency-police' : 'agency-subway';
        const tr = $('<tr></tr>');
        tr.html(`
            <td class="${agencyClass}" style="text-align: center;">${item.agency}</td>
            <td><strong>${item.title}</strong></td>
            <td style="text-align: center;">${item.date}</td>
            <td>${item.place}</td>
            <td style="text-align: center;"><button class="map-btn" onclick="findLocation('${item.place}', '${item.title}')">📍 보기</button></td>
        `);
        tableBody.append(tr);
    });
}

function formatPoliceDate(dateStr) {
    if (dateStr.includes('-')) return dateStr; 
    if (dateStr && dateStr.length === 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
}

let map;
let ps;
let infowindow;

window.onload = function() {
    const mapContainer = document.getElementById('map'); 
    if (mapContainer) {
        kakao.maps.load(function() {
            const mapOption = {
                center: new kakao.maps.LatLng(35.8714354, 128.601445), 
                level: 4 
            };  
            map = new kakao.maps.Map(mapContainer, mapOption); 
            ps = new kakao.maps.services.Places(); 
            infowindow = new kakao.maps.InfoWindow({zIndex:1}); 
        });
    }
};

function findLocation(placeName, itemName) {
    if (!ps) {
        alert("api error");
        return;
    }
    
    let searchKeyword = placeName;
    const policeMatch = placeName.match(/(.*?(경찰서|지구대|파출소|치안센터))/);
    if (policeMatch) {
        searchKeyword = policeMatch[1];
    }
    
    ps.keywordSearch(searchKeyword, function(data, status, pagination) {
        if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(data[0].y, data[0].x);
            map.panTo(coords); 
            
            const marker = new kakao.maps.Marker({
                map: map,
                position: coords
            });
            
            const content = `
                <div style="padding:10px; font-size:13px; width:200px; text-align:center;">
                    <strong style="color:#2c3e50;">${placeName}</strong><br>
                    <span style="color:#e74c3c; font-weight:bold;">물품: ${itemName}</span>
                </div>
            `;
            infowindow.setContent(content);
            infowindow.open(map, marker);
        } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
            alert(`'${searchKeyword}'의 위치를 카카오 지도 시스템에서 특정할 수 없습니다.`);
        } else {
            alert('카카오 위치 데이터 검색 중 오류가 발생했습니다.');
        }
    });
}