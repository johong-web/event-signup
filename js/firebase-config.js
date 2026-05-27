// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDI5bjgC9CI4yc1QBM6l-F4SH6eY4QsIeI",
    authDomain: "narasarang-deeplink.firebaseapp.com",
    projectId: "narasarang-deeplink",
    storageBucket: "narasarang-deeplink.firebasestorage.app",
    messagingSenderId: "342850040347",
    appId: "1:342850040347:web:4ac7f47463ae3ae00efebe",
    measurementId: "G-1M9N112ZF0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
