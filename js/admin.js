document.addEventListener('DOMContentLoaded', function () {
    // ===== 로그인 처리 =====
    var loginScreen = document.getElementById('loginScreen');
    var adminArea = document.getElementById('adminArea');
    var loginForm = document.getElementById('loginForm');
    var loginIdInput = document.getElementById('loginId');
    var loginPwInput = document.getElementById('loginPw');
    var loginError = document.getElementById('loginError');
    var btnLogout = document.getElementById('btnLogout');

    var CREDENTIALS_HASH = '195d2bb584b2970e7f2fa926c33807ec87f3bb25ff648564f9373084090c0050';

    // 세션 확인
    if (sessionStorage.getItem('adminAuth') === 'true') {
        showAdmin();
    }

    function sha256(str) {
        var encoder = new TextEncoder();
        var data = encoder.encode(str);
        return crypto.subtle.digest('SHA-256', data).then(function (buffer) {
            var hashArray = Array.from(new Uint8Array(buffer));
            return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        });
    }

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = loginIdInput.value.trim();
        var pw = loginPwInput.value;

        if (!id || !pw) {
            loginError.classList.add('show');
            return;
        }

        sha256(id + ':' + pw).then(function (hash) {
            if (hash === CREDENTIALS_HASH) {
                loginError.classList.remove('show');
                sessionStorage.setItem('adminAuth', 'true');
                showAdmin();
            } else {
                loginError.classList.add('show');
                loginPwInput.value = '';
                loginPwInput.focus();
            }
        });
    });

    btnLogout.addEventListener('click', function () {
        sessionStorage.removeItem('adminAuth');
        adminArea.style.display = 'none';
        loginScreen.style.display = '';
        loginIdInput.value = '';
        loginPwInput.value = '';
    });

    function showAdmin() {
        loginScreen.style.display = 'none';
        adminArea.style.display = '';
    }

    // ===== 탭 전환 =====
    var tabs = document.querySelectorAll('.admin-tab');
    var tabRequests = document.getElementById('tabRequests');
    var tabTerms = document.getElementById('tabTerms');

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');

            if (tab.dataset.tab === 'requests') {
                tabRequests.style.display = '';
                tabTerms.style.display = 'none';
            } else {
                tabRequests.style.display = 'none';
                tabTerms.style.display = '';
            }
        });
    });

    // ===== 신청 내역 탭 =====
    var tableBody = document.getElementById('tableBody');
    var tableWrap = document.getElementById('tableWrap');
    var cardList = document.getElementById('cardList');
    var totalCount = document.getElementById('totalCount');
    var emptyState = document.getElementById('emptyState');
    var loadingState = document.getElementById('loadingState');

    db.collection('card_requests')
        .orderBy('createdAt', 'desc')
        .limit(500)
        .onSnapshot(function (snapshot) {
            loadingState.style.display = 'none';
            var docs = snapshot.docs;

            // 이름+연락처 중복 제거 (createdAt desc 정렬이므로 먼저 나온 것이 최신)
            var seen = {};
            var uniqueDocs = [];
            docs.forEach(function (doc) {
                var data = doc.data();
                var key = (data.name || '') + '|' + (data.phone || '');
                if (!seen[key]) {
                    seen[key] = true;
                    uniqueDocs.push(doc);
                }
            });

            totalCount.textContent = '총 ' + uniqueDocs.length + '건';

            if (uniqueDocs.length === 0) {
                emptyState.style.display = 'block';
                tableWrap.style.display = 'none';
                tableBody.innerHTML = '';
                cardList.innerHTML = '';
                return;
            }

            emptyState.style.display = 'none';
            tableWrap.style.display = '';

            var tableHtml = '';
            var cardHtml = '';

            uniqueDocs.forEach(function (doc, index) {
                var data = doc.data();
                var dateStr = formatDate(data.createdAt);
                var safeName = escapeHtml(data.name || '');
                var safePhone = escapeHtml(formatPhone(data.phone || ''));

                tableHtml += '<tr>' +
                    '<td>' + (index + 1) + '</td>' +
                    '<td>' + safeName + '</td>' +
                    '<td>' + safePhone + '</td>' +
                    '<td>' + dateStr + '</td>' +
                    '</tr>';

                cardHtml += '<div class="admin-card">' +
                    '<div class="admin-card-row">' +
                    '<span class="admin-card-label">No.</span>' +
                    '<span class="admin-card-value">' + (index + 1) + '</span>' +
                    '</div>' +
                    '<div class="admin-card-row">' +
                    '<span class="admin-card-label">이름</span>' +
                    '<span class="admin-card-value">' + safeName + '</span>' +
                    '</div>' +
                    '<div class="admin-card-row">' +
                    '<span class="admin-card-label">연락처</span>' +
                    '<span class="admin-card-value">' + safePhone + '</span>' +
                    '</div>' +
                    '<div class="admin-card-row">' +
                    '<span class="admin-card-label">신청일시</span>' +
                    '<span class="admin-card-value">' + dateStr + '</span>' +
                    '</div>' +
                    '</div>';
            });

            tableBody.innerHTML = tableHtml;
            cardList.innerHTML = cardHtml;
        }, function (error) {
            console.error('데이터 조회 실패:', error);
            loadingState.style.display = 'none';
            emptyState.style.display = 'block';
            emptyState.querySelector('p').textContent = '데이터를 불러올 수 없습니다.';
        });

    // ===== 약관 관리 탭 =====
    var termsFormWrap = document.getElementById('termsFormWrap');
    var termContent = document.getElementById('termContent');
    var btnTermSave = document.getElementById('btnTermSave');
    var termsLoadingEl = document.getElementById('termsLoading');
    var termsPreview = document.getElementById('termsPreview');

    // Firestore에서 약관 내용 불러오기
    db.collection('terms_content').doc('main').get()
        .then(function (doc) {
            termsLoadingEl.style.display = 'none';
            termsFormWrap.style.display = '';

            if (doc.exists) {
                var data = doc.data();
                termContent.value = data.content || '';
                termsPreview.innerHTML = data.content || '<p style="color:#999;">약관 내용을 입력하면 미리보기가 표시됩니다.</p>';
            }
        })
        .catch(function (error) {
            console.error('약관 내용 로드 실패:', error);
            termsLoadingEl.style.display = 'none';
            termsFormWrap.style.display = '';
        });

    // textarea 입력 시 미리보기 업데이트
    termContent.addEventListener('input', function () {
        var val = termContent.value.trim();
        if (val) {
            termsPreview.innerHTML = val;
        } else {
            termsPreview.innerHTML = '<p style="color:#999;">약관 내용을 입력하면 미리보기가 표시됩니다.</p>';
        }
    });

    // 저장 버튼
    btnTermSave.addEventListener('click', function () {
        var content = termContent.value.trim();

        if (!content) {
            showToast('약관 내용을 입력해주세요.');
            termContent.focus();
            return;
        }

        btnTermSave.disabled = true;
        btnTermSave.textContent = '저장 중...';

        db.collection('terms_content').doc('main').set({
            content: content,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function () {
            showToast('약관 내용이 저장되었습니다.');
            btnTermSave.disabled = false;
            btnTermSave.textContent = '저장';
        }).catch(function (error) {
            console.error('저장 실패:', error);
            showToast('저장에 실패했습니다.');
            btnTermSave.disabled = false;
            btnTermSave.textContent = '저장';
        });
    });

    // ===== 공통 유틸 =====
    function formatDate(timestamp) {
        if (!timestamp || !timestamp.toDate) return '-';
        try {
            var d = timestamp.toDate();
            var year = d.getFullYear();
            var month = String(d.getMonth() + 1).padStart(2, '0');
            var day = String(d.getDate()).padStart(2, '0');
            var hour = String(d.getHours()).padStart(2, '0');
            var min = String(d.getMinutes()).padStart(2, '0');
            return year + '.' + month + '.' + day + ' ' + hour + ':' + min;
        } catch (e) {
            return '-';
        }
    }

    function formatPhone(phone) {
        if (!phone) return '-';
        if (phone.length === 11) {
            return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        } else if (phone.length === 10) {
            return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        return phone;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function showToast(message) {
        var toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(function () {
            toast.classList.remove('show');
        }, 2500);
    }
});
