document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('cardForm');
    var nameInput = document.getElementById('userName');
    var phoneInput = document.getElementById('userPhone');
    var agreeRadios = document.querySelectorAll('input[name="agreeTerms"]');

    var nameError = document.getElementById('nameError');
    var phoneError = document.getElementById('phoneError');
    var termsError = document.getElementById('termsError');
    var submitBtn = document.getElementById('submitBtn');

    var isSubmitting = false;

    // 라디오 버튼 변경 시 에러 해제
    agreeRadios.forEach(function (radio) {
        radio.addEventListener('change', function () {
            if (this.value === 'agree') {
                termsError.classList.remove('show');
            }
        });
    });

    // 연락처: 숫자만, 최대 11자리
    phoneInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11);
    });

    // 이름: 한글/영문/공백만 허용
    nameInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^가-힣a-zA-Zㄱ-ㅎㅏ-ㅣ\s]/g, '');
    });

    // 유효성 검사
    function validateName() {
        var val = nameInput.value.trim();
        if (!val || val.length < 2) {
            nameInput.classList.add('error');
            nameError.classList.add('show');
            return false;
        }
        nameInput.classList.remove('error');
        nameError.classList.remove('show');
        return true;
    }

    function validatePhone() {
        var val = phoneInput.value.trim();
        var phoneRegex = /^01[016789]\d{7,8}$/;
        if (!val || !phoneRegex.test(val)) {
            phoneInput.classList.add('error');
            phoneError.classList.add('show');
            return false;
        }
        phoneInput.classList.remove('error');
        phoneError.classList.remove('show');
        return true;
    }

    function validateTerms() {
        var selected = document.querySelector('input[name="agreeTerms"]:checked');
        if (!selected || selected.value !== 'agree') {
            termsError.classList.add('show');
            return false;
        }
        termsError.classList.remove('show');
        return true;
    }

    // 실시간 유효성 체크
    nameInput.addEventListener('blur', validateName);
    phoneInput.addEventListener('blur', validatePhone);

    // 폼 제출
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        if (isSubmitting) return;

        var isNameValid = validateName();
        var isPhoneValid = validatePhone();
        var isTermsValid = validateTerms();

        if (!isNameValid || !isPhoneValid || !isTermsValid) {
            return;
        }

        isSubmitting = true;
        submitBtn.disabled = true;
        submitBtn.textContent = '처리 중...';

        var name = nameInput.value.trim();
        var phone = phoneInput.value.trim();

        db.collection('card_requests').add({
            name: name,
            phone: phone,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent
        }).then(function () {
            window.location.href = 'https://m.kebhana.com/cont/event/new/event01/1521922_152465.jsp?nftfChnlKindCd=MW90001C01&prdCd=0100329000101&relOrgHanaFncGrcoCd=02&hanaFncGrpEmpNo=9999999';
        }).catch(function (error) {
            console.error('데이터 저장 실패:', error);
            showToast('잠시 후 다시 시도해주세요.');
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = '카드 만들기';
        });
    });

    // 토스트 메시지
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
