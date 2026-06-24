# Tinder Clone

Full-stack starter for a Tinder-style dating app clone.

## Structure

- `back-end`: Express, MongoDB, JWT auth, swipe/match logic, chat API, Socket.IO.
- `frontend`: Expo React Native app with auth, swipe cards, matches, chat and profile screens.
- `docs`: project documents.

## Run Backend

```bash
cd back-end
cp .env.example .env
npm install
npm run dev
```

## Run Frontend

```bash
cd frontend
npm install
npm start

##Chay tren android studio devices
flutter devices
launch ....
```

# Set `EXPO_PUBLIC_API_URL` if your API is not at `http://localhost:5000/api`.

# 🔥 TinderApp - Enhanced UI/UX Clone Project

Dự án **TinderApp** là một ứng dụng hẹn hò di động được lấy cảm hứng từ Tinder nhưng được nghiên cứu và tinh chỉnh mạnh mẽ về mặt **UI/UX (Giao diện & Trải nghiệm người dùng)**. Mục tiêu cốt lõi là khắc phục những điểm hạn chế về thao tác của phiên bản gốc, tối ưu hóa luồng tương tác và mang lại cảm giác mượt mà, giữ chân người dùng tốt hơn.

---

## 📌 1. Giới thiệu Tổng quan & Điểm khác biệt UI/UX

### 🎯 Mục tiêu dự án

- Tái hiện trọn vẹn các tính năng cốt lõi của một mạng xã hội hẹn hò: Đăng nhập, Tạo hồ sơ, Quẹt thẻ (Swipe), Khớp đôi (Match), và Nhắn tin thời gian thực (Real-time Chat).
- Thử nghiệm và áp dụng các quy chuẩn thiết kế giao diện hiện đại.

### 🌟 Các cải tiến và điểm khác biệt về UI/UX so với Tinder gốc

- **Thao tác Quẹt Thẻ (Advanced Card Swiping):** Hiệu ứng xoay góc và độ mờ (opacity) của thẻ bài khi kéo được tính toán chuẩn xác theo tọa độ ngón tay, tạo cảm giác "vật lý" chân thực hơn.
- **Trực quan hóa Thông tin (Profile Layout Layering):** Phần tiểu sử (Bio) và sở thích được thiết kế dạng thẻ lơ lửng (Floating glassmorphism overlay) trên ảnh profile, giúp người dùng đọc nhanh thông tin mà không cần phải chuyển hẳn sang màn hình chi tiết.
- **Hệ thống Micro-interactions (Tương tác nhỏ, hiệu quả lớn):** \* Hiệu ứng tim đập nhẹ khi nhấn nút Like.
  - Màn hình thông báo **"It's a Match!"** sử dụng hiệu ứng gradient chuyển màu động (Animated Gradient) tạo cảm giác hân hoan, kích thích người dùng gửi tin nhắn ngay lập tức.
- **Tối ưu luồng Nhắn tin (Chat Flow):** Trạng thái hoạt động (Active status) và thông báo tin nhắn mới được tích hợp gọn gàng, giảm thiểu số thao tác chuyển màn hình (Tab switching).

---

## 🛠️ 2. Kiến thức & Công nghệ đã áp dụng

Để hoàn thiện ứng dụng này, dự án đã kết hợp nhiều mảng kiến thức lập trình di động và tối ưu hệ thống:

### 🧠 Kiến thức chuyên môn

- **Xử lý Cử chỉ Phức tạp (Gesture Handling):** Sử dụng các thư viện quản lý sự kiện vuốt chạm để bắt chính xác các thao tác: vuốt nhẹ (flick), kéo giữ (drag), thả tay (release) nhằm định đoạt hành vi Like/Dislike.
- **Quản lý Trạng thái Toàn cục (Global State Management):** Quản lý đồng bộ dữ liệu người dùng hiện tại, danh sách các đối tượng xung quanh, trạng thái Match và các cuộc hội thoại chat mà không bị xung đột dữ liệu.
- **Bất đồng bộ & Đồng bộ Thời gian thực (Asynchronous & Real-time):**
  - Sử dụng cơ chế Lập trình bất đồng bộ (Async/Await) để tải tài nguyên ảnh chất lượng cao mà không gây giật lag giao diện (UI blocking).
  - Tích hợp Socket hoặc Database Listeners để cập nhật tin nhắn ngay lập tức khi hai bên đang trò chuyện.
- **Kiến trúc Mã nguồn Sạch (Clean Architecture):** Tổ chức mã nguồn theo mô hình phân tách rõ ràng giữa: Giao diện (UI) - Xử lý Logic (Business Logic) - Quản lý Dữ liệu (Data Service).

### 💻 Công nghệ và Thư viện (Tech Stack)

- **Frontend/Mobile Framework:** React Native / Flutter / Native Android-iOS _(Có thể tùy chỉnh theo code thực tế của bạn)_.
- **Xử lý Animation:** Sử dụng thư viện chuyên sâu về hoạt ảnh hiệu năng cao (như Reanimated hoặc Core Animation).
- **Backend & Cơ sở dữ liệu:** Firebase (Auth, Firestore, Cloud Messaging) hoặc REST API kết hợp cơ sở dữ liệu để lưu trữ luồng dữ liệu của User.

---

## 📁 3. Cấu trúc và Chi tiết các Thư mục/File trong Source Code

Dưới đây là sơ đồ cấu trúc thư mục của dự án và chức năng chi tiết của từng thành phần:

```text
TinderApp/
├── 📁 assets/                 # Quản lý tài nguyên tĩnh (Images, Icons, Fonts)
├── 📁 src/                    # Thư mục chứa toàn bộ mã nguồn chính của app
│   ├── 📁 components/         # Các thành phần UI tái sử dụng nhiều lần
│   │   ├── 📄 TinderCard.ext  # Thành phần thẻ bài chứa ảnh và thông tin có logic vuốt
│   │   ├── 📄 ActionButtons.ext# Cụm nút bấm tương tác nhanh (X, Tim, Quay lại)
│   │   └── 📄 CustomInput.ext   # Ô nhập liệu tối ưu UI cho màn hình Chat/Login
│   ├── 📁 screens/            # Quản lý các màn hình chính của ứng dụng
│   │   ├── 📄 LoginScreen.ext # Màn hình đăng nhập & Xác thực người dùng
│   │   ├── 📄 HomeScreen.ext  # Màn hình chính nơi diễn ra logic quẹt thẻ Tinder
│   │   ├── 📄 ProfileScreen.ext# Màn hình quản lý và chỉnh sửa thông tin cá nhân
│   │   ├── 📄 MatchScreen.ext # Màn hình hiển thị hiệu ứng khi hai người Match nhau
│   │   └── 📄 ChatScreen.ext  # Màn hình nhắn tin thời gian thực với đối phương
│   ├── 📁 navigation/         # Cấu hình luồng chuyển màn hình (Routing/Navigation)
│   ├── 📁 services/           # Xử lý kết nối API, Firebase, lưu trữ dữ liệu
│   ├── 📁 store/ hoặc context/# Quản lý State/Dữ liệu toàn cục cho toàn bộ app
│   └── 📁 utils/              # Các hàm bổ trợ (Format ngày tháng, validate dữ liệu...)
├── 📄 .env.example            # File mẫu cấu hình các biến môi trường bảo mật
├── 📄 package.json / ...      # File quản lý các thư viện phụ thuộc (Dependencies)
└── 📄 README.md               # Tài liệu hướng dẫn và giới thiệu dự án (File này)
```

📝 Mô tả chi tiết các file quan trọng:
TinderCard: Đây là trái tim của giao diện Home. File này chứa thuật toán xử lý đồ họa, tính toán góc xoay dựa trên khoảng cách kéo dX, dY từ tâm màn hình.

HomeScreen: Chịu trách nhiệm gọi danh sách dữ liệu người dùng từ services, quản lý mảng (array) các thẻ bài, và loại bỏ thẻ sau khi người dùng đã đưa ra quyết định (Like/Dislike).

MatchScreen: File này xử lý các hiệu ứng overlay, làm mờ màn hình nền và kích hoạt âm thanh/hoạt ảnh chúc mừng khi bắt được sự kiện trùng khớp từ database.

🚀 4. Hướng dẫn Cài đặt & Chạy Ứng dụng
Vui lòng làm theo các bước dưới đây để thiết lập môi trường và khởi chạy ứng dụng trên máy tính của bạn:

📋 Yêu cầu hệ thống trước khi cài đặt (Prerequisites)
Đã cài đặt Node.js (Phiên bản từ 16.x trở lên) hoặc Flutter SDK (tùy theo môi trường phát triển của bạn).

Đã cài đặt trình quản lý gói: npm hoặc yarn.

Môi trường giả lập hoặc thiết bị thật:

Android: Android Studio và một thiết bị ảo Android (Emulator) đã chạy sẵn.

iOS: Xcode (Yêu cầu hệ điều hành macOS) và thiết bị ảo iOS (Simulator).

⚙️ Quy trình triển khai chi tiết
Bước 1: Tải mã nguồn về máy
Mở terminal trên máy tính của bạn và chạy lệnh:

Bash

```text
git clone [https://github.com/vutuandat17/TinderApp.git](https://github.com/vutuandat17/TinderApp.git)
cd TinderApp
```

Bước 2: Cài đặt các gói thư viện phụ thuộc (Dependencies)
Cài đặt tất cả các thư viện được định nghĩa trong file cấu hình bằng một trong các lệnh sau:

Bash

```text
npm install
```

# hoặc nếu bạn dùng yarn:

```text
yarn install
```

(Nếu đây là dự án iOS/React Native, hãy chạy thêm lệnh cài thư viện cấu trúc native: cd ios && pod install && cd ..)

Bước 3: Thiết lập cấu hình hệ thống (Environment Variables)

Copy file mẫu môi trường để tạo file cấu hình chính thức:

Bash

```text
cp .env.example .env
```

Mở file .env vừa tạo và điền các thông tin kết nối (như API Key, URL Server, hoặc cấu hình Firebase của riêng bạn).

Bước 4: Khởi chạy ứng dụng

Chạy trên thiết bị/máy ảo Android:

Bash

```text
npm run android   # Hoặc: npx react-native run-android / flutter run
```

Chạy trên thiết bị/máy ảo iOS:

Bash

```text
npm run ios       # Hoặc: npx react-native run-ios / flutter run
```
