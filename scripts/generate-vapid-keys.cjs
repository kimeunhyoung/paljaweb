#!/usr/bin/env node
/** 웹 푸시 VAPID 키 생성 — .env / Render 환경 변수에 넣을 값 출력 */
const webpush = require('web-push');

const keys = webpush.generateVAPIDKeys();
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
console.log('VAPID_SUBJECT=mailto:ohayou989@gmail.com');
