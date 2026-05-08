var emailInput = document.getElementById("email");
var passwordInput = document.getElementById("password");
var confirmPasswordInput = document.getElementById("confirmPassword");
var submitBtn = document.getElementById("btn-login");

function validationEmail() {
    if (emailInput.value.trim() === "") {
        emailInput.style.border = "2px solid red";
        document.getElementById("invalidEmail").style.display = "block";
        return false;
    } else {
        emailInput.style.border = "2px solid #3a3a3d";
        document.getElementById("invalidEmail").style.display = "none";
        return true;
    }
}
function validPassword() {
    if (passwordInput.value.trim() === "") {
        passwordInput.style.border = "2px solid red";
        document.getElementById("invalidPass").style.display = "block";
        return false;
    } else {
        passwordInput.style.border = "2px solid #3a3a3d";
        document.getElementById("invalidPass").style.display = "none";
        return true;
    }
}
function validConfirmPassword() {
    if (!confirmPasswordInput) return true;
    var password = passwordInput.value;
    var confirmPassword = confirmPasswordInput.value;
    if (password !== confirmPassword) {
        confirmPasswordInput.style.border = "2px solid red";
        document.getElementById("invalidConfirmPass").style.display = "block";
        return false;
    } else {
        confirmPasswordInput.style.border = "2px solid #3a3a3d";
        document.getElementById("invalidConfirmPass").style.display = "none";
        return true;
    }
}
function reset() {
    emailInput.value = "";
    passwordInput.value = "";
    confirmPasswordInput.value = "";
    emailInput.style.border = "1px solid rgba(17, 17, 17, 0.55)";
    passwordInput.style.border = "1px solid rgba(17, 17, 17, 0.55)";
    confirmPasswordInput.style.border = "1px solid rgba(17, 17, 17, 0.55)";
}

function savaData() {
    // Khi xác thực thành công, email và mật khẩu được nhập là thông tin đăng nhập mới.
    // Điều này sẽ ghi đè bất kỳ thông tin đăng nhập nào trước đó.
    localStorage.setItem("email", emailInput.value);
    localStorage.setItem("password", passwordInput.value);
}