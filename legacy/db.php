<?php
// Database settings are supplied by the environment; real credentials must not be committed.
$host = getenv("DB_HOST") ?: "localhost";
$port = (int) (getenv("DB_PORT") ?: "3306");
$user = getenv("DB_USER") ?: "traffic_app";
$password = getenv("DB_PASSWORD");
$dbname = getenv("DB_NAME") ?: "trafficviolationsdb";

if ($password === false || $password === "") {
    http_response_code(500);
    exit("Database configuration is incomplete.");
}

// إنشاء اتصال باستخدام MySQLi
$conn = new mysqli($host, $user, $password, $dbname, $port);

// التحقق من نجاح الاتصال
if ($conn->connect_error) {
    error_log("Database connection failed: " . $conn->connect_error);
    http_response_code(500);
    exit("Database connection failed.");
}

// تعيين الترميز UTF-8 لضمان دعم اللغة العربية
$conn->set_charset("utf8mb4");

// يمكن طباعة رسالة نجاح (اختياري)
// echo "تم الاتصال بقاعدة البيانات بنجاح!";
?>
