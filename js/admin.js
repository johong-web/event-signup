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
            totalCount.textContent = '총 ' + docs.length + '건';

            if (docs.length === 0) {
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

            docs.forEach(function (doc, index) {
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
    var btnAddTerm = document.getElementById('btnAddTerm');
    var termsFormWrap = document.getElementById('termsFormWrap');
    var termTitle = document.getElementById('termTitle');
    var termContent = document.getElementById('termContent');
    var btnTermSave = document.getElementById('btnTermSave');
    var btnTermCancel = document.getElementById('btnTermCancel');
    var termsListContainer = document.getElementById('termsListContainer');
    var termsLoadingEl = document.getElementById('termsLoading');
    var termsEmpty = document.getElementById('termsEmpty');

    var editingTermId = null;

    // 항목 추가 버튼
    btnAddTerm.addEventListener('click', function () {
        editingTermId = null;
        termTitle.value = '';
        termContent.value = '';
        termsFormWrap.style.display = '';
        btnAddTerm.style.display = 'none';
        termTitle.focus();
    });

    // 취소 버튼
    btnTermCancel.addEventListener('click', function () {
        termsFormWrap.style.display = 'none';
        btnAddTerm.style.display = '';
        editingTermId = null;
    });

    // 저장 버튼
    btnTermSave.addEventListener('click', function () {
        var title = termTitle.value.trim();
        var content = termContent.value.trim();

        if (!title) {
            showToast('약관 내용을 입력해주세요.');
            termTitle.focus();
            return;
        }
        if (!content) {
            showToast('상세 내용을 입력해주세요.');
            termContent.focus();
            return;
        }

        btnTermSave.disabled = true;
        btnTermSave.textContent = '저장 중...';

        if (editingTermId) {
            // 수정
            db.collection('terms_items').doc(editingTermId).update({
                title: title,
                content: content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function () {
                showToast('약관 항목이 수정되었습니다.');
                resetTermsForm();
            }).catch(function (error) {
                console.error('수정 실패:', error);
                showToast('수정에 실패했습니다.');
                btnTermSave.disabled = false;
                btnTermSave.textContent = '저장';
            });
        } else {
            // 신규 등록
            db.collection('terms_items').get().then(function (snapshot) {
                var newOrder = snapshot.size + 1;
                return db.collection('terms_items').add({
                    title: title,
                    content: content,
                    order: newOrder,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }).then(function () {
                showToast('약관 항목이 등록되었습니다.');
                resetTermsForm();
            }).catch(function (error) {
                console.error('등록 실패:', error);
                showToast('등록에 실패했습니다.');
                btnTermSave.disabled = false;
                btnTermSave.textContent = '저장';
            });
        }
    });

    function resetTermsForm() {
        termsFormWrap.style.display = 'none';
        btnAddTerm.style.display = '';
        termTitle.value = '';
        termContent.value = '';
        editingTermId = null;
        btnTermSave.disabled = false;
        btnTermSave.textContent = '저장';
    }

    // 약관 항목 실시간 조회 (onSnapshot)
    db.collection('terms_items')
        .orderBy('order', 'asc')
        .onSnapshot(function (snapshot) {
            termsLoadingEl.style.display = 'none';

            if (snapshot.empty) {
                termsEmpty.style.display = 'block';
                termsListContainer.innerHTML = '';
                return;
            }

            termsEmpty.style.display = 'none';

            var html = '';
            var termIndex = 0;
            snapshot.forEach(function (doc) {
                termIndex++;
                var data = doc.data();
                var id = doc.id;
                var detailLines = (data.content || '').split('\n');
                var detailHtml = '';
                detailLines.forEach(function (line) {
                    var trimmed = line.trim();
                    if (trimmed) {
                        detailHtml += '<div class="terms-admin-detail-line">' + escapeHtml(trimmed) + '</div>';
                    }
                });

                html += '<div class="terms-admin-item" data-id="' + id + '">' +
                    '<div class="terms-admin-content">' +
                    '<div class="terms-admin-title">' + termIndex + '. ' + escapeHtml(data.title || '') + '</div>' +
                    '<div class="terms-admin-detail">' + detailHtml + '</div>' +
                    '</div>' +
                    '<div class="terms-admin-actions">' +
                    '<button class="btn-term-edit" data-id="' + id + '" data-title="' + escapeAttr(data.title || '') + '" data-content="' + escapeAttr(data.content || '') + '">수정</button>' +
                    '<button class="btn-term-delete" data-id="' + id + '">삭제</button>' +
                    '</div>' +
                    '</div>';
            });

            termsListContainer.innerHTML = html;

            // 수정 버튼 이벤트
            termsListContainer.querySelectorAll('.btn-term-edit').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    editingTermId = this.dataset.id;
                    termTitle.value = this.dataset.title;
                    termContent.value = this.dataset.content;
                    termsFormWrap.style.display = '';
                    btnAddTerm.style.display = 'none';
                    termTitle.focus();
                    window.scrollTo({ top: termsFormWrap.offsetTop - 80, behavior: 'smooth' });
                });
            });

            // 삭제 버튼 이벤트
            termsListContainer.querySelectorAll('.btn-term-delete').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var docId = this.dataset.id;
                    if (!confirm('이 약관 항목을 삭제하시겠습니까?')) return;

                    db.collection('terms_items').doc(docId).delete()
                        .then(function () {
                            showToast('약관 항목이 삭제되었습니다.');
                        })
                        .catch(function (error) {
                            console.error('삭제 실패:', error);
                            showToast('삭제에 실패했습니다.');
                        });
                });
            });
        }, function (error) {
            console.error('약관 항목 조회 실패:', error);
            termsLoadingEl.style.display = 'none';
            termsEmpty.style.display = 'block';
            termsEmpty.querySelector('p').textContent = '약관 항목을 불러올 수 없습니다.';
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

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;');
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
