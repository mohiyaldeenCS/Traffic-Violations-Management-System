<?php
require_once "db.php";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST["username"] ?? "");
    $email = trim($_POST["email"] ?? "");
    $password = $_POST["password"] ?? "";
    $confirmPassword = $_POST["confirmPassword"] ?? "";
    $phone = trim($_POST["phone"] ?? "");
    $account_type = "User";

    if (empty($username) || empty($email) || empty($password) || empty($confirmPassword) || empty($phone)) {
        die("جميع الحقول مطلوبة!");
    }

    if ($password !== $confirmPassword) {
        die("كلمة المرور غير متطابقة!");
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        exit("عنوان البريد الإلكتروني غير صالح!");
    }

    if (!preg_match('/^[A-Za-z0-9_.-]{3,50}$/', $username)) {
        http_response_code(400);
        exit("اسم المستخدم غير صالح!");
    }

    if (strlen($password) < 8) {
        http_response_code(400);
        exit("يجب أن تتكون كلمة المرور من 8 أحرف على الأقل!");
    }

    $checkEmailQuery = "SELECT id FROM users WHERE email = ? OR username = ?";
    $stmt = $conn->prepare($checkEmailQuery);
    $stmt->bind_param("ss", $email, $username);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        http_response_code(409);
        exit("اسم المستخدم أو البريد الإلكتروني مسجل بالفعل!");
    }
    $stmt->close();

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    $insertQuery = "INSERT INTO users (username, email, password, phone, account_type) VALUES (?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($insertQuery);
    $stmt->bind_param("sssss", $username, $email, $hashedPassword, $phone, $account_type);

    if ($stmt->execute()) {
        header("Location: login.html");
        exit();
    } else {
        error_log("Registration failed: " . $stmt->error);
        http_response_code(500);
        echo "تعذر إنشاء الحساب.";
    }

    $stmt->close();
    $conn->close();
}
?>

<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>إنشاء حساب جديد</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="styles.css">
</head>
<body class="login-body">

<div class="register-container">
    <h2><i class="fas fa-user-plus"></i> إنشاء حساب جديد</h2>
    <form id="registerForm" method="POST" action="register.php">
        
        <div class="input-group">
            <input type="text" name="username" class="form-control" placeholder="اسم المستخدم" required>
            <span class="input-icon"><i class="fas fa-user"></i></span>
        </div>

        <div class="input-group">
            <input type="email" name="email" class="form-control" placeholder="أدخل البريد الإلكتروني" required>
            <span class="input-icon"><i class="fas fa-envelope"></i></span>
        </div>

        <div class="input-group">
            <input type="password" name="password" class="form-control" placeholder="أدخل كلمة المرور" required>
            <span class="input-icon"><i class="fas fa-lock"></i></span>
        </div>

        <div class="input-group mb-3">
            <input type="password" name="confirmPassword" class="form-control" placeholder="أدخل تأكيد كلمة المرور" required>
            <span class="input-icon"><i class="fas fa-check-circle"></i></span>
        </div>

        <div class="input-group mb-3">
            <input type="text" name="phone" class="form-control" placeholder="أدخل رقم الهاتف" required>
            <span class="input-icon"><i class="fas fa-phone"></i></span>
        </div>

        <div class="d-flex justify-content-between">
            <button type="reset" class="btn btn-secondary"><i class="fas fa-times"></i> إلغاء</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-plus-circle"></i> إنشاء الحساب</button>
        </div>

        <p class="back-to-login">
            <a href="login.html">العودة إلى تسجيل الدخول</a>
        </p>
    </form>
</div>

<script src="script.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
