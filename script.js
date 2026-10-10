
document.addEventListener("DOMContentLoaded", function() {
    // قائمة الكاميرات المتاحة
    const cameras = [
        { id: 1, name: "كاميرا 1", location: "جولة مذبح", status: "متصل" },
        { id: 2, name: "كاميرا 2", location: "شارع الستين", status: "غير متصل" },
        { id: 3, name: "كاميرا 3", location: "جولة الرويشان", status: "متصل" }
    ];

    // تحميل الكاميرات في القائمة المنسدلة
    let cameraSelect = document.getElementById("cameraSelect");
    if (!cameraSelect) return;
    cameras.forEach(camera => {
        let option = document.createElement("option");
        option.value = camera.id;
        option.textContent = camera.name;
        cameraSelect.appendChild(option);
    });

    // تحديث معلومات الاتصال عند اختيار كاميرا
    cameraSelect.addEventListener("change", function() {
        let selectedCamera = cameras.find(c => c.id == this.value);
        if (selectedCamera) {
            document.getElementById("location").textContent = selectedCamera.location;
            let statusElement = document.getElementById("status");
            let cameraMessage = document.getElementById("cameraMessage");

            if (selectedCamera.status === "متصل") {
                statusElement.innerHTML = `<span class="text-success">متصل ●</span>`;
                cameraMessage.textContent = "تم الاتصال بالكاميرا";
            } else {
                statusElement.innerHTML = `<span class="text-danger">غير متصل ●</span>`;
                cameraMessage.textContent = "لم يتم الاتصال بالكاميرا";
            }
        }
    });
});
document.addEventListener("DOMContentLoaded", function () {
    console.log("Script Loaded!");
});

function fetchViolation() {
    let violationNumber = document.getElementById("violationNumber").value;

    // بيانات المخالفات الوهمية (يتم استبدالها من API لاحقًا)
    const violations = {
        "531520": {
            id: "531520",
            type: "عكس خط",
            location: "الستين الغربي جوار جسر مذبح",
            date: "2024-09-25 الساعة 1:50 ظهرًا",
            fine: "17000",
            image: "12.png",
            plateNumber: "211554",
            plateRegion: "الأمانة",
            plateType: "خصوصي",
            plateImage: "12.png"
        }
    };

    // البحث عن المخالفة وإظهارها
    if (violations[violationNumber]) {
        let violation = violations[violationNumber];

        document.getElementById("violationID").textContent = "المخالفة رقم " + violation.id;
        document.getElementById("violationType").textContent = violation.type;
        document.getElementById("violationLocation").textContent = violation.location;
        document.getElementById("violationDate").textContent = violation.date;
        document.getElementById("violationFine").textContent = violation.fine;

        document.getElementById("plateNumber").textContent = violation.plateNumber;
        document.getElementById("plateRegion").textContent = violation.plateRegion;
        document.getElementById("plateType").textContent = violation.plateType;

        document.getElementById("violationImage").src = violation.image;
        document.getElementById("plateImage").src = violation.plateImage;

        document.getElementById("violationDetails").style.display = "block";
    } else {
        alert("لم يتم العثور على المخالفة!");
    }
}


document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("userTableBody")) loadUsers();
});

function loadUsers() {
    const users = [
        { id: 1, username: "admin", password: "******", phone: "777777777", status: "فعال", accountType: "Admin" },
        { id: 2, username: "user1", password: "******", phone: "773333333", status: "موقوف", accountType: "مستخدم عادي" }
    ];

    const userTableBody = document.getElementById("userTableBody");
    userTableBody.innerHTML = "";

    users.forEach(user => {
        let statusIcon = user.status === "فعال" 
            ? '<i class="fas fa-circle text-success"></i>' 
            : '<i class="fas fa-circle text-danger"></i>';

        let row = `
            <tr id="user-${user.id}">
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.password}</td>
                <td>${user.phone}</td>
                <td id="status-${user.id}">${user.status} ${statusIcon}</td>
                <td>${user.accountType}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="activateUser(${user.id})"><i class="fas fa-check-circle"></i> تفعيل</button>
                    <button class="btn btn-warning btn-sm" onclick="promoteUser(${user.id})"><i class="fas fa-user-shield"></i> ترقية</button>
                    <button class="btn btn-info btn-sm" onclick="editUser(${user.id})"><i class="fas fa-edit"></i> تعديل</button>
                </td>
            </tr>
        `;
        userTableBody.innerHTML += row;
    });
}

function activateUser(userId) {
    // تغيير حالة المستخدم إلى "فعال" في الواجهة
    const statusCell = document.getElementById(`status-${userId}`);
    statusCell.innerHTML = `فعال <i class="fas fa-circle text-success"></i>`;
    
    // هنا يمكنك إرسال التحديث إلى الخادم إذا كان هناك API
    // مثال:
    // fetch(`/api/activateUser/${userId}`, { method: 'POST' })
}

function promoteUser(userId) {
    // تغيير نوع الحساب إلى "Admin" في الواجهة
    const userRow = document.getElementById(`user-${userId}`);
    const accountTypeCell = userRow.children[5]; // assuming accountType is the 6th cell
    accountTypeCell.innerHTML = 'Admin';

    // هنا يمكنك إرسال التحديث إلى الخادم إذا كان هناك API
    // مثال:
    // fetch(`/api/promoteUser/${userId}`, { method: 'POST' })
}

function editUser(userId) {
    // الانتقال إلى صفحة التعديل مع إرسال المعرف في عنوان URL
    window.location.href = `edit-user.html?id=${userId}`;
}

function toggleProfile(userId) {
    window.location.href=`profile.html?id=${userId}`;
    
}
function openAddUserPage() {
    window.location.href = "add-user.html";
}

// function editUser(userId) {
//     alert("فتح صفحة تعديل المستخدم ID: " + userId);
// }
function cancelAddUser() {
    window.location.href = "users.html";
}


// جلب بيانات المستخدم من قاعدة البيانات (محاكاة بيانات)
const userData = {
    id: 1,
    username: "Abdalmalik",
    phone: "000000000",
    jobId: "EMP1001",
    accountType: "Admin"
};

// تحميل البيانات تلقائيًا عند فتح الصفحة
window.addEventListener("load", function() {
    if (!document.getElementById("editUserForm")) return;
    document.getElementById("username").value = userData.username;
    document.getElementById("phone").value = userData.phone;
    document.getElementById("jobId").value = userData.jobId;

    // تحديد نوع الحساب بناءً على البيانات الحالية
    if (userData.accountType === "Admin") {
        document.getElementById("admin").checked = true;
    } else {
        document.getElementById("user").checked = true;
    }
});

// عند الضغط على زر "إلغاء"
function cancelEditUser() {
    window.location.href = "users.html"; // الرجوع إلى صفحة إدارة المستخدمين
}

// عند حفظ التعديلات
const editUserForm = document.getElementById("editUserForm");
if (editUserForm) editUserForm.addEventListener("submit", function(event) {
    event.preventDefault();

    // جلب القيم الجديدة
    const updatedUser = {
        username: document.getElementById("username").value,
        phone: document.getElementById("phone").value,
        jobId: document.getElementById("jobId").value,
        accountType: document.querySelector('input[name="accountType"]:checked').value
    };

    console.log("تم تحديث البيانات:", updatedUser);
    alert("تم حفظ التعديلات بنجاح!");

    // هنا يمكن إرسال البيانات الجديدة إلى السيرفر لحفظها
});

// عند الضغط على زر "إلغاء"
function cancelLogin() {
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
}

function sendVerificationCode() {
    const email = document.getElementById("email").value;
    
    if (email.trim() === "") {
        alert("يرجى إدخال البريد الإلكتروني أو اسم المستخدم.");
        return;
    }

    // محاكاة إرسال الرمز
    alert("تم إرسال رمز التحقق إلى البريد الإلكتروني.");
    document.getElementById("verificationSection").style.display = "block";
}

// التحقق من رمز التحقق وإعادة تعيين كلمة المرور
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
if (forgotPasswordForm) forgotPasswordForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const verificationCode = document.getElementById("verificationCode").value;
    const newPassword = document.getElementById("newPassword").value;

    if (verificationCode.trim() === "" || newPassword.trim() === "") {
        alert("يرجى إدخال رمز التحقق وكلمة المرور الجديدة.");
        return;
    }

    alert("تم إعادة تعيين كلمة المرور بنجاح!");
    window.location.href = "login.html"; // إعادة التوجيه إلى صفحة تسجيل الدخول
});

// إلغاء التسجيل
function cancelRegistration() {
    window.location.href = "login.html";
}
