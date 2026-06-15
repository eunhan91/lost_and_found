const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const POLICE_SERVICE_KEY = 'ba8b6f14a9dfe0e4cc98d30b069ca407f6f880a4ab9634c291a8b75a8d21fb74';

app.get('/api/police', async (req, res) => {
    try {
        const { keyword } = req.query; 
        const url = `https://apis.data.go.kr/1320000/LosPtfundInfoInqireService/getPtLosfundInfoAccTpNmCstdyPlace?serviceKey=${POLICE_SERVICE_KEY}&PRDT_NM=${encodeURIComponent(keyword)}&numOfRows=10`;
        
        const response = await fetch(url);
        const xmlData = await response.text();
        
        res.header("Content-Type", "application/xml");
        res.send(xmlData);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: '경찰청 API 호출 실패' });
    }
});

app.get('/api/daegu', async (req, res) => {
    try {
        const url = 'http://www.dtro.or.kr/openApi/lostInfo.xml';
        
        let response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' }
        });
        
        const rawCookies = response.headers.getSetCookie();
        let xmlData = await response.text();
        
        if (xmlData.includes('sabFingerPrint')) {
            const sigMatch = xmlData.match(/sabSignature=([^';]+)/);
            const sabSig = sigMatch ? sigMatch[1] : '';
            
            let cookieArr = rawCookies.map(c => c.split(';')[0].trim());
            cookieArr.push(`sabFingerPrint=1920,1080,www.dtro.or.kr`);
            cookieArr.push(`sabSignature=${sabSig}`);
            
            const combinedCookieHeader = cookieArr.join('; ');
            
            await new Promise(resolve => setTimeout(resolve, 1200));
            
            let retryResponse = await fetch(url, {
                headers: {
                    'Cookie': combinedCookieHeader,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Referer': 'http://www.dtro.or.kr/openApi/lostInfo.xml',
                    'Connection': 'keep-alive'
                }
            });
            xmlData = await retryResponse.text();
        }
        
        res.header("Content-Type", "application/xml");
        res.send(xmlData);
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: '대구교통공사 API 호출 실패' });
    }
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});