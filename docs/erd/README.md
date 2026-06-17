# ERD - Entity Relationship Diagram

Phiên bản snapshot của sơ đồ quan hệ dữ liệu (ERD) được tạo từ các Mongoose schema hiện tại trong `back-end/src/models`.

Lưu ý:

- Đây là một snapshot — cập nhật khi schema thay đổi.
- Một số trường đã được gom nhóm cho dễ đọc; xem mã nguồn nếu cần chi tiết chính xác.

```mermaid
erDiagram
    %% Entities
    USER {
        ObjectId _id PK
        string name
        string email
        string passwordHash
        date birthDate
        string gender
        string[] interestedIn
        string bio
        string[] interests
        string jobTitle
        string school
        Point location
        number preferences.maxDistanceKm
        number preferences.ageRange.min
        number preferences.ageRange.max
        boolean isVerified
        date lastActive
        date createdAt
        date updatedAt
    }

    PHOTO {
        string url
        string publicId
        boolean isPrimary
        date uploadedAt
        string status
        object metadata
    }

    SWIPE {
        ObjectId _id PK
        ObjectId swiper FK
        ObjectId target FK
        string direction
        date createdAt
        date updatedAt
    }

    MATCH {
        ObjectId _id PK
        ObjectId[] users FK
        string status
        ObjectId unmatchedBy FK
        string lastMessage_text
        ObjectId lastMessage_sender
        date matchedAt
        date createdAt
        date updatedAt
    }

    MESSAGE {
        ObjectId _id PK
        ObjectId match FK
        ObjectId sender FK
        string text
        string imageUrl
        Object[] attachments
        ObjectId[] readBy
        boolean edited
        boolean deleted
        date createdAt
        date updatedAt
    }

    %% Relationships
    USER ||--o{ PHOTO : "has photos"
    USER ||--o{ SWIPE : "swipes"
    USER ||--o{ MATCH : "participates"
    USER ||--o{ MESSAGE : "sends"

    MATCH ||--o{ MESSAGE : "contains"
    MATCH }|--|{ USER : "users"

    SWIPE }o--|| USER : "target"
    SWIPE }o--|| USER : "swiper"

    %% Notes
    %% - PHOTO is embedded in USER.photos in current schema but shown separate for clarity.
    %% - MATCH.users is an array of two user ids; enforce uniqueness in application logic or with participantsHash.

```

## Hướng dẫn ngắn

- File này là một snapshot tự động hóa tay — khi thay đổi schema, cập nhật thủ công file này hoặc tạo script sinh Mermaid từ schema nếu muốn tự động.
- Nếu muốn, tôi có thể bổ sung script nhỏ để generate Mermaid từ models.

---

File generated from project schemas — cập nhật khi cần.
