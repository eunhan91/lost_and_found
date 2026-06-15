document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('keywordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

async function performSearch() {
    const keyword = document.getElementById('keywordInput').value.trim();
    if (!keyword) {
        alert('분실하신 물품의 키워드를 입력해 주세요!');
        return;
    }

    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #2980b9; font-weight: bold; padding: 30px 0;">데이터를 통합 검색 중입니다...</td></tr>`;

    try {
        const [policeResponse, daeguResponse] = await Promise.all([
            fetch(`/api/police?keyword=${encodeURIComponent(keyword)}`),
            fetch('/api/daegu')
        ]);

        const policeXmlText = await policeResponse.text();
        const daeguXmlText = await daeguResponse.text();

        console.log("=== 경찰청 수신 데이터 ===", policeXmlText);
        console.log("=== 대구교통공사 수신 데이터 ===", daeguXmlText);

        const parser = new DOMParser();
        const policeDoc = parser.parseFromString(policeXmlText, "text/xml");
        const daeguDoc = parser.parseFromString(daeguXmlText, "text/xml");

        let mergedList = [];

        const policeItems = policeDoc.getElementsByTagName("item");
        for (let item of policeItems) {
            const title = item.getElementsByTagName("fdPrdtNm")[0]?.textContent || 
                          item.getElementsByTagName("idbGoodsNm")[0]?.textContent || "물품명 없음";
            const date = item.getElementsByTagName("fdYmd")[0]?.textContent || 
                         item.getElementsByTagName("rceptDe")[0]?.textContent || "-";
            const place = item.getElementsByTagName("depPlace")[0]?.textContent || 
                          item.getElementsByTagName("keepPrsNm")[0]?.textContent || "보관처";

            mergedList.push({
                agency: "경찰청",
                title: title,
                date: formatPoliceDate(date),
                place: place
            });
        }

        const daeguItems = daeguDoc.getElementsByTagName("apiData");
        for (let item of daeguItems) {
            const title = item.getElementsByTagName("regTitle")[0]?.textContent || "물품명 없음";
            const date = item.getElementsByTagName("regPickingDate")[0]?.textContent || "-";
            const place = item.getElementsByTagName("regKeepingplace")[0]?.textContent || "대구 지하철 역사";

            if (title.toLowerCase().includes(keyword.toLowerCase())) {
                mergedList.push({
                    agency: "대구교통공사",
                    title: title,
                    date: date,
                    place: place
                });
            }
        }

        renderTable(mergedList);

    } catch (error) {
        console.error("데이터 매싱 오류:", error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #e74c3c; font-weight: bold; padding: 30px 0;">데이터를 매싱하는 과정에서 오류가 발생했습니다.</td></tr>`;
    }
}

function renderTable(list) {
    const tableBody = document.getElementById('tableBody');
    if (list.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #7f8c8d; padding: 30px 0;">조회된 통합 유실물 데이터가 없습니다.</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';
    list.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge ${item.agency === '경찰청' ? 'police' : 'subway'}">${item.agency}</span></td>
            <td><strong>${item.title}</strong></td>
            <td>${item.date}</td>
            <td>${item.place}</td>
            <td><button class="map-btn" onclick="findLocation('${item.place}', '${item.title}')">📍 위치 보기</button></td>
        `;
        tableBody.appendChild(tr);
    });
}

function formatPoliceDate(dateStr) {
    if (dateStr && dateStr.length === 8) {
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    }
    return dateStr;
}

function findLocation(address, title) {
    console.log(`지도 연동 요청 수신 -> 보관처: ${address}, 물품명: ${title}`);
}