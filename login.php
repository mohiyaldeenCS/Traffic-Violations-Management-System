<?php
session_start();
require_once "db.php"; // استدعاء ملف الاتصال بقاعدة البيانات

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST["username"] ?? "");
    $password = $_POST["password"] ?? "";

    if (empty($username) || empty($password)) {
        http_response_code(400);
        exit("يجب إدخال اسم المستخدم وكلمة المرور!");
    }

    // التحقق من المستخدم في قاعدة البيانات
    $query = "SELECT id, username, password, account_type FROM users WHERE username = ? AND status = 'Active'";
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->store_result();
    
    if ($stmt->num_rows > 0) {
        $stmt->bind_result($id, $username, $hashedPassword, $account_type);
        $stmt->fetch();

        if (password_verify($password, $hashedPassword)) {
            session_regenerate_id(true);
            $_SESSION["user_id"] = $id;
            $_SESSION["username"] = $username;
            $_SESSION["account_type"] = $account_type;

            // إعادة توجيه المستخدم حسب نوع الحساب
            if ($account_type === "Admin") {
                header("Location: index.html");
            } else {
                header("Location: index.html");
            }
            exit();
        } else {
            http_response_code(401);
            exit("اسم المستخدم أو كلمة المرور غير صحيحة!");
        }
    } else {
        http_response_code(401);
        exit("اسم المستخدم أو كلمة المرور غير صحيحة!");
    }

    $stmt->close();
    $conn->close();
}
?>
