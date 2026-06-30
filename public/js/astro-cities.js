/**
 * 출생지 좌표 데이터 (도시 중심부 위경도)
 * 시간대(timezone)는 계산 라이브러리(tz-lookup)가 좌표로 자동 판별하므로 별도 저장하지 않음.
 * group: 'kr' 국내 / 'world' 해외
 * 전역 window.ASTRO_CITIES 로 노출.
 */
(function () {
  var CITIES = [
    // ── 대한민국 ──
    { ko: '서울',   group: 'kr', lat: 37.5665, lng: 126.9780 },
    { ko: '인천',   group: 'kr', lat: 37.4563, lng: 126.7052 },
    { ko: '수원',   group: 'kr', lat: 37.2636, lng: 127.0286 },
    { ko: '성남',   group: 'kr', lat: 37.4200, lng: 127.1265 },
    { ko: '고양',   group: 'kr', lat: 37.6584, lng: 126.8320 },
    { ko: '용인',   group: 'kr', lat: 37.2411, lng: 127.1776 },
    { ko: '춘천',   group: 'kr', lat: 37.8813, lng: 127.7300 },
    { ko: '강릉',   group: 'kr', lat: 37.7519, lng: 128.8761 },
    { ko: '청주',   group: 'kr', lat: 36.6424, lng: 127.4890 },
    { ko: '대전',   group: 'kr', lat: 36.3504, lng: 127.3845 },
    { ko: '천안',   group: 'kr', lat: 36.8151, lng: 127.1139 },
    { ko: '세종',   group: 'kr', lat: 36.4801, lng: 127.2890 },
    { ko: '전주',   group: 'kr', lat: 35.8242, lng: 127.1480 },
    { ko: '광주',   group: 'kr', lat: 35.1595, lng: 126.8526 },
    { ko: '목포',   group: 'kr', lat: 34.8118, lng: 126.3922 },
    { ko: '여수',   group: 'kr', lat: 34.7604, lng: 127.6622 },
    { ko: '대구',   group: 'kr', lat: 35.8714, lng: 128.6014 },
    { ko: '포항',   group: 'kr', lat: 36.0190, lng: 129.3435 },
    { ko: '울산',   group: 'kr', lat: 35.5384, lng: 129.3114 },
    { ko: '부산',   group: 'kr', lat: 35.1796, lng: 129.0756 },
    { ko: '창원',   group: 'kr', lat: 35.2280, lng: 128.6811 },
    { ko: '제주',   group: 'kr', lat: 33.4996, lng: 126.5312 },

    // ── 아시아 ──
    { ko: '도쿄',         group: 'world', lat: 35.6762, lng: 139.6503 },
    { ko: '오사카',       group: 'world', lat: 34.6937, lng: 135.5023 },
    { ko: '베이징',       group: 'world', lat: 39.9042, lng: 116.4074 },
    { ko: '상하이',       group: 'world', lat: 31.2304, lng: 121.4737 },
    { ko: '홍콩',         group: 'world', lat: 22.3193, lng: 114.1694 },
    { ko: '타이베이',     group: 'world', lat: 25.0330, lng: 121.5654 },
    { ko: '싱가포르',     group: 'world', lat: 1.3521,  lng: 103.8198 },
    { ko: '방콕',         group: 'world', lat: 13.7563, lng: 100.5018 },
    { ko: '하노이',       group: 'world', lat: 21.0278, lng: 105.8342 },
    { ko: '호치민',       group: 'world', lat: 10.8231, lng: 106.6297 },
    { ko: '마닐라',       group: 'world', lat: 14.5995, lng: 120.9842 },
    { ko: '자카르타',     group: 'world', lat: -6.2088, lng: 106.8456 },
    { ko: '쿠알라룸푸르', group: 'world', lat: 3.1390,  lng: 101.6869 },
    { ko: '델리',         group: 'world', lat: 28.6139, lng: 77.2090 },
    { ko: '두바이',       group: 'world', lat: 25.2048, lng: 55.2708 },

    // ── 유럽 ──
    { ko: '런던',         group: 'world', lat: 51.5074, lng: -0.1278 },
    { ko: '파리',         group: 'world', lat: 48.8566, lng: 2.3522 },
    { ko: '베를린',       group: 'world', lat: 52.5200, lng: 13.4050 },
    { ko: '프랑크푸르트', group: 'world', lat: 50.1109, lng: 8.6821 },
    { ko: '로마',         group: 'world', lat: 41.9028, lng: 12.4964 },
    { ko: '마드리드',     group: 'world', lat: 40.4168, lng: -3.7038 },
    { ko: '바르셀로나',   group: 'world', lat: 41.3851, lng: 2.1734 },
    { ko: '암스테르담',   group: 'world', lat: 52.3676, lng: 4.9041 },
    { ko: '취리히',       group: 'world', lat: 47.3769, lng: 8.5417 },
    { ko: '빈',           group: 'world', lat: 48.2082, lng: 16.3738 },
    { ko: '모스크바',     group: 'world', lat: 55.7558, lng: 37.6173 },
    { ko: '이스탄불',     group: 'world', lat: 41.0082, lng: 28.9784 },

    // ── 아메리카 ──
    { ko: '뉴욕',           group: 'world', lat: 40.7128, lng: -74.0060 },
    { ko: '로스앤젤레스',   group: 'world', lat: 34.0522, lng: -118.2437 },
    { ko: '샌프란시스코',   group: 'world', lat: 37.7749, lng: -122.4194 },
    { ko: '시카고',         group: 'world', lat: 41.8781, lng: -87.6298 },
    { ko: '시애틀',         group: 'world', lat: 47.6062, lng: -122.3321 },
    { ko: '호놀룰루',       group: 'world', lat: 21.3069, lng: -157.8583 },
    { ko: '토론토',         group: 'world', lat: 43.6532, lng: -79.3832 },
    { ko: '밴쿠버',         group: 'world', lat: 49.2827, lng: -123.1207 },
    { ko: '멕시코시티',     group: 'world', lat: 19.4326, lng: -99.1332 },
    { ko: '상파울루',       group: 'world', lat: -23.5505, lng: -46.6333 },
    { ko: '부에노스아이레스', group: 'world', lat: -34.6037, lng: -58.3816 },

    // ── 오세아니아 ──
    { ko: '시드니',   group: 'world', lat: -33.8688, lng: 151.2093 },
    { ko: '멜버른',   group: 'world', lat: -37.8136, lng: 144.9631 },
    { ko: '오클랜드', group: 'world', lat: -36.8485, lng: 174.7633 }
  ];

  window.ASTRO_CITIES = CITIES;
})();
