/**
 * 도시 좌표 + IANA 시간대 (서버·클라 공통 원본)
 * public/js/astro-cities.js 와 동기화 유지
 */
const ASTRO_CITIES = [
  { ko: '서울', group: 'kr', lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul' },
  { ko: '인천', group: 'kr', lat: 37.4563, lng: 126.7052, tz: 'Asia/Seoul' },
  { ko: '수원', group: 'kr', lat: 37.2636, lng: 127.0286, tz: 'Asia/Seoul' },
  { ko: '성남', group: 'kr', lat: 37.42, lng: 127.1265, tz: 'Asia/Seoul' },
  { ko: '고양', group: 'kr', lat: 37.6584, lng: 126.832, tz: 'Asia/Seoul' },
  { ko: '용인', group: 'kr', lat: 37.2411, lng: 127.1776, tz: 'Asia/Seoul' },
  { ko: '춘천', group: 'kr', lat: 37.8813, lng: 127.73, tz: 'Asia/Seoul' },
  { ko: '강릉', group: 'kr', lat: 37.7519, lng: 128.8761, tz: 'Asia/Seoul' },
  { ko: '청주', group: 'kr', lat: 36.6424, lng: 127.489, tz: 'Asia/Seoul' },
  { ko: '대전', group: 'kr', lat: 36.3504, lng: 127.3845, tz: 'Asia/Seoul' },
  { ko: '천안', group: 'kr', lat: 36.8151, lng: 127.1139, tz: 'Asia/Seoul' },
  { ko: '세종', group: 'kr', lat: 36.4801, lng: 127.289, tz: 'Asia/Seoul' },
  { ko: '전주', group: 'kr', lat: 35.8242, lng: 127.148, tz: 'Asia/Seoul' },
  { ko: '광주', group: 'kr', lat: 35.1595, lng: 126.8526, tz: 'Asia/Seoul' },
  { ko: '목포', group: 'kr', lat: 34.8118, lng: 126.3922, tz: 'Asia/Seoul' },
  { ko: '여수', group: 'kr', lat: 34.7604, lng: 127.6622, tz: 'Asia/Seoul' },
  { ko: '대구', group: 'kr', lat: 35.8714, lng: 128.6014, tz: 'Asia/Seoul' },
  { ko: '포항', group: 'kr', lat: 36.019, lng: 129.3435, tz: 'Asia/Seoul' },
  { ko: '울산', group: 'kr', lat: 35.5384, lng: 129.3114, tz: 'Asia/Seoul' },
  { ko: '부산', group: 'kr', lat: 35.1796, lng: 129.0756, tz: 'Asia/Seoul' },
  { ko: '창원', group: 'kr', lat: 35.228, lng: 128.6811, tz: 'Asia/Seoul' },
  { ko: '제주', group: 'kr', lat: 33.4996, lng: 126.5312, tz: 'Asia/Seoul' },

  { ko: '도쿄', group: 'world', lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  { ko: '오사카', group: 'world', lat: 34.6937, lng: 135.5023, tz: 'Asia/Tokyo' },
  { ko: '베이징', group: 'world', lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai' },
  { ko: '상하이', group: 'world', lat: 31.2304, lng: 121.4737, tz: 'Asia/Shanghai' },
  { ko: '홍콩', group: 'world', lat: 22.3193, lng: 114.1694, tz: 'Asia/Hong_Kong' },
  { ko: '타이베이', group: 'world', lat: 25.033, lng: 121.5654, tz: 'Asia/Taipei' },
  { ko: '싱가포르', group: 'world', lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore' },
  { ko: '방콕', group: 'world', lat: 13.7563, lng: 100.5018, tz: 'Asia/Bangkok' },
  { ko: '하노이', group: 'world', lat: 21.0278, lng: 105.8342, tz: 'Asia/Ho_Chi_Minh' },
  { ko: '호치민', group: 'world', lat: 10.8231, lng: 106.6297, tz: 'Asia/Ho_Chi_Minh' },
  { ko: '마닐라', group: 'world', lat: 14.5995, lng: 120.9842, tz: 'Asia/Manila' },
  { ko: '자카르타', group: 'world', lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta' },
  { ko: '쿠알라룸푸르', group: 'world', lat: 3.139, lng: 101.6869, tz: 'Asia/Kuala_Lumpur' },
  { ko: '델리', group: 'world', lat: 28.6139, lng: 77.209, tz: 'Asia/Kolkata' },
  { ko: '두바이', group: 'world', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },

  { ko: '런던', group: 'world', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  { ko: '파리', group: 'world', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris' },
  { ko: '베를린', group: 'world', lat: 52.52, lng: 13.405, tz: 'Europe/Berlin' },
  { ko: '프랑크푸르트', group: 'world', lat: 50.1109, lng: 8.6821, tz: 'Europe/Berlin' },
  { ko: '로마', group: 'world', lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome' },
  { ko: '마드리드', group: 'world', lat: 40.4168, lng: -3.7038, tz: 'Europe/Madrid' },
  { ko: '바르셀로나', group: 'world', lat: 41.3851, lng: 2.1734, tz: 'Europe/Madrid' },
  { ko: '암스테르담', group: 'world', lat: 52.3676, lng: 4.9041, tz: 'Europe/Amsterdam' },
  { ko: '취리히', group: 'world', lat: 47.3769, lng: 8.5417, tz: 'Europe/Zurich' },
  { ko: '빈', group: 'world', lat: 48.2082, lng: 16.3738, tz: 'Europe/Vienna' },
  { ko: '모스크바', group: 'world', lat: 55.7558, lng: 37.6173, tz: 'Europe/Moscow' },
  { ko: '이스탄불', group: 'world', lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul' },

  { ko: '뉴욕', group: 'world', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
  { ko: '로스앤젤레스', group: 'world', lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
  { ko: '샌프란시스코', group: 'world', lat: 37.7749, lng: -122.4194, tz: 'America/Los_Angeles' },
  { ko: '시카고', group: 'world', lat: 41.8781, lng: -87.6298, tz: 'America/Chicago' },
  { ko: '시애틀', group: 'world', lat: 47.6062, lng: -122.3321, tz: 'America/Los_Angeles' },
  { ko: '호놀룰루', group: 'world', lat: 21.3069, lng: -157.8583, tz: 'Pacific/Honolulu' },
  { ko: '토론토', group: 'world', lat: 43.6532, lng: -79.3832, tz: 'America/Toronto' },
  { ko: '밴쿠버', group: 'world', lat: 49.2827, lng: -123.1207, tz: 'America/Vancouver' },
  { ko: '멕시코시티', group: 'world', lat: 19.4326, lng: -99.1332, tz: 'America/Mexico_City' },
  { ko: '상파울루', group: 'world', lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo' },
  { ko: '부에노스아이레스', group: 'world', lat: -34.6037, lng: -58.3816, tz: 'America/Argentina/Buenos_Aires' },

  { ko: '시드니', group: 'world', lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
  { ko: '멜버른', group: 'world', lat: -37.8136, lng: 144.9631, tz: 'Australia/Melbourne' },
  { ko: '오클랜드', group: 'world', lat: -36.8485, lng: 174.7633, tz: 'Pacific/Auckland' },
];

function findCityByKo(ko) {
  const name = String(ko || '').trim();
  if (!name) return null;
  let hit = ASTRO_CITIES.find((c) => c.ko === name);
  if (hit) return hit;
  // "부산광역시" · "서울시" 등 저장된 표기 흡수
  hit = ASTRO_CITIES.find((c) => c.ko && name.indexOf(c.ko) !== -1);
  if (hit) return hit;
  if (name.length >= 2) {
    hit = ASTRO_CITIES.find((c) => c.ko && c.ko.indexOf(name) !== -1);
  }
  return hit || null;
}

/** UTC Date → 해당 IANA 시간대 벽시계 */
function utcToCivilInTz(dateInput, timeZone) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const tz = timeZone || 'UTC';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(d);
  const get = (type) => {
    const p = parts.find((x) => x.type === type);
    return p ? Number(p.value) : NaN;
  };
  let hh = get('hour');
  if (hh === 24) hh = 0; // 일부 엔진
  return {
    y: get('year'),
    mo: get('month'),
    da: get('day'),
    hh,
    mi: get('minute'),
    tz,
  };
}

module.exports = { ASTRO_CITIES, findCityByKo, utcToCivilInTz };
