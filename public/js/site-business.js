/** PG·통신판매 고지용 사업자 정보 (한 곳만 수정) */
window.SITE_BUSINESS = {
  name: '8코드(8CODE)',
  ceo: '김태훈',
  regNo: '624-55-00806',
  mailOrderNo: '제 2026-부산수영-0361 호',
  address: '부산광역시 수영구 수영로 632-1, 602호 (광안동, 솔내음 파비르)',
  /** 사업자 연락처 (휴대폰) */
  phone: '010-5280-2300',
  email: 'ohayou989@gmail.com',
};

window.SITE_BUSINESS_HTML = [
  '상호 ' + window.SITE_BUSINESS.name + ' · 대표 ' + window.SITE_BUSINESS.ceo + ' · 사업자등록번호 ' + window.SITE_BUSINESS.regNo,
  '통신판매업 신고번호 ' + window.SITE_BUSINESS.mailOrderNo,
  window.SITE_BUSINESS.address,
  '휴대폰 ' + window.SITE_BUSINESS.phone + ' · 이메일 <a href="mailto:' + window.SITE_BUSINESS.email + '">' + window.SITE_BUSINESS.email + '</a>',
].join('<br>');
