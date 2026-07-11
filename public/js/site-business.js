/** PG·통신판매 고지용 사업자 정보 (한 곳만 수정) */
window.SITE_BUSINESS = {
  name: '8코드(8CODE)',
  ceo: '김태훈',
  regNo: '624-55-00806',
  mailOrderNo: '제 2026-부산수영-0361 호',
  /** 호수·건물명 비공개 (도로명만 고지) */
  address: '부산광역시 수영구 수영로 632-1',
  /** 팔자연구소 상담·문의 전용 */
  phone: '010-8674-8481',
  email: 'ohayou989@gmail.com',
  /** 카카오톡 채널 (문의) */
  kakaoChannel: 'https://pf.kakao.com/_HXxmwX',
  kakaoChat: 'https://pf.kakao.com/_HXxmwX/chat',
};

window.SITE_BUSINESS_HTML = [
  '상호 ' + window.SITE_BUSINESS.name + ' · 대표 ' + window.SITE_BUSINESS.ceo + ' · 사업자등록번호 ' + window.SITE_BUSINESS.regNo,
  '통신판매업 신고번호 ' + window.SITE_BUSINESS.mailOrderNo,
  window.SITE_BUSINESS.address,
  '휴대폰 ' + window.SITE_BUSINESS.phone + ' · 이메일 <a href="mailto:' + window.SITE_BUSINESS.email + '">' + window.SITE_BUSINESS.email + '</a>',
  '카카오톡 문의 <a href="' + window.SITE_BUSINESS.kakaoChat + '" target="_blank" rel="noopener noreferrer">팔자연구소 채널</a>',
].join('<br>');
