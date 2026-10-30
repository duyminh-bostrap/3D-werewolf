# Huyết Nguyệt Thôn 3D — Tối Ưu Web App Mobile & Chuẩn Hóa Luồng Chơi Có Đếm Ngược

Bản nâng cấp này tái cấu trúc luồng vào game ưu tiên cho thiết bị di động (Mobile-First Web App), rút gọn văn bản rườm rà, bổ sung hệ thống đồng hồ đếm ngược thời gian thực cho từng giai đoạn Đêm / Ngày / Biện Minh Trên Giàn, và tinh chỉnh bộ nút điều khiển 3D (Joystick, Mắt Camera, Nhảy) nhỏ gọn, bán trong suốt với cơ chế nhìn theo hướng giữ và tự động trả về góc nhìn mặc định khi thả tay.

## User Review & Critical Decisions

> [!IMPORTANT]
> Các quyết định thiết kế cốt lõi dưới đây đã được thống nhất dựa trên lựa chọn của bạn:

- **Quyết định 1 — Luồng Mở Đầu 2 Bước (Mobile-First)**: Chia màn hình mở đầu thành **Bước 1: Tạo Tên & Tùy Chỉnh Ngoại Hình Nhân Vật 3D** (ưu tiên khung Preview 3D xoay 360° lớn, rõ nét ở trung tâm màn hình điện thoại) $\rightarrow$ **Bước 2: Tạo Phòng Mới hoặc Nhập Mã Phòng** để bước vào Sảnh Chờ 3D của phòng đó.
- **Quyết định 2 — Đếm Ngược Pha Đêm (60 Giây) & Tự Động Qua Đêm**: Mỗi đêm có bộ đếm ngược **60 giây (01:00)**. Các AI Bot tự động chốt kỹ năng sau vài giây đầu; ngay khi toàn bộ người chơi có chức năng trong làng đã thực hiện xong hành động, hệ thống mở nút **Qua Đêm Ngay** và tự động chuyển sang Ban Ngày mà không cần chờ hết 60 giây.
- **Quyết định 3 — Pha Thảo Luận Ngày (180 Giây) & Biện Minh Trên Giàn (30 Giây)**: Ban ngày có **3 phút (03:00)** thảo luận và bỏ phiếu (có nút **Bỏ Phiếu Trắng / Skip**). Nếu có người bị bầu nhiều phiếu nhất lên giàn treo cổ, trận đấu chuyển sang pha **Biện Minh & Phán Quyết (30 giây)**: vừa chạy đồng hồ 30s cho người bị treo cổ giải thích, vừa mở ngay 2 nút **Giết (Treo Cổ)** hoặc **Sống (Tha Bổng)** cho dân làng biểu quyết.

---

## 1. Overview & Core Concept

- **What It Does**: Trải nghiệm Ma Sói 3D nhiều người chơi thời gian thực (WebSocket + WebRTC Voice/Chat) tối ưu hóa cho màn hình cảm ứng di động lẫn máy tính, dẫn dắt người chơi từ khâu tạo hình nhân vật 3D trực quan, vào phòng chờ thiết lập vai trò, đến các vòng Đêm – Ngày – Phán Quyết có nhịp độ kịch tính nhờ đồng hồ đếm ngược tự động.
- **Target Audience / Persona**: Người chơi trên trình duyệt di động (375px–430px) và máy tính muốn trải nghiệm Ma Sói 3D thao tác một chạm gọn gàng, nhìn rõ nhân vật 3D và không bị chữ nghĩa hay nút bấm quá khổ che khuất tầm nhìn.
- **Key Value**:
  - Giao diện súc tích, không còn đoạn mô tả dài dòng ở màn hình chính.
  - Khung xem trước nhân vật 3D (3D Turntable Preview) nổi bật ngay bước đầu tiên.
  - Nhịp độ ván đấu rõ ràng, tự động hóa hoàn toàn với đồng hồ đếm ngược 60s (Đêm), 180s (Thảo luận Ngày) và 30s (Biện minh & Vote Sống/Giết).
  - Cụm 3 nút điều khiển cảm ứng (Di chuyển, Mắt nhìn, Nhảy) thu nhỏ hợp lý, giảm độ đục (tăng độ trong suốt) và nút Mắt hoạt động chuẩn cơ chế "giữ kéo để liếc nhìn đúng hướng — thả tay tự quay về góc nhìn mặc định".

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Màn Hình Mở Đầu Ngắn Gọn & Bước 1: Tạo Nhân Vật 3D**:
   - Phần tiêu đề **HUYẾT NGUYỆT THÔN** chỉ giữ 1 dòng mô tả cực ngắn gọn: *"Ma Sói 3D · Đàm thoại Voice & Tarot định mệnh"*.
   - Khung **Preview 3D Nhân Vật** chiếm vị trí trung tâm phía trên để người chơi nhìn rõ toàn thân nhân vật 3D, xoay 360° hoặc thử dạng Ma Sói.
   - Bên dưới là ô nhập **Tên Nhân Vật**, chọn nhanh trang phục/mũ/màu áo choàng/đèn lồng và nút **Tiếp Tục → Chọn Phòng**.
2. **Bước 2: Tạo Phòng Hoặc Nhập Số Phòng**:
   - Hiển thị thẻ nhân vật 3D vừa tạo kèm 2 lựa chọn rõ ràng cho Mobile:
     - **Tạo Phòng Mới**: Tự sinh mã phòng ngẫu nhiên (hoặc mã tùy chọn) và vào thẳng Sảnh Chờ với tư cách Chủ Phòng.
     - **Nhập Mã Phòng**: Nhập mã phòng có sẵn để tham gia vào Sảnh Chờ của phòng đó.
3. **Sảnh Chờ 3D (Lobby) — Thiết Lập Bởi Chủ Phòng**:
   - Người chơi tự do chạy nhảy, đá cầu lửa trong làng 3D.
   - Chủ phòng sử dụng cụm điều khiển góc trên để chỉnh **Sĩ số phòng (5–15 người)** và mở **Kho Bài 15 Role** (dạng thẻ gọn có nút `ℹ` giải thích chi tiết từng thẻ) trước khi ấn **Bắt Đầu Ván Đấu**.
4. **Khi Bắt Đầu Game — Lật Bài Tarot & Pha Đêm (60 Giây)**:
   - Lá bài Tarot chức năng xuất hiện để người chơi lật xem vai trò bí mật.
   - Bước vào Đêm: Thanh trạng thái hiển thị đồng hồ đếm ngược **01:00 (60s)** và tiến độ thực hiện chức năng của làng.
   - Khi người chơi và AI đã chọn xong mục tiêu 3D, hệ thống tự động chuyển pha (hoặc cho phép nhấn **Qua Đêm Ngay**) mà không phải đợi hết 60 giây.
5. **Pha Ban Ngày — Thảo Luận & Bầu Chọn (3 Phút / 180 Giây)**:
   - Đồng hồ đếm ngược **03:00 (180s)**.
   - Người chơi thảo luận qua Mic / Chat nhanh và chạm trực tiếp vào nhân vật 3D để bỏ phiếu nghi phạm hoặc ấn **Bỏ Phiếu Trắng (Skip)**.
   - Nếu toàn bộ người sống sót đã bỏ phiếu (hoặc hết 3 phút), hệ thống tổng kết phiếu bầu:
     - Nếu phiếu Trắng nhiều nhất hoặc hòa phiếu: Không ai lên giàn, chuyển thẳng sang Đêm tiếp theo.
     - Nếu có 1 người bị bầu cao nhất: Chuyển sang pha **Lên Giàn Biện Minh (30 Giây)**.
6. **Pha Lên Giàn Biện Minh & Vote Giết / Sống (30 Giây)**:
   - Camera và giao diện làm nổi bật người bị đưa lên giàn kèm đồng hồ đếm ngược **00:30 (30s)**.
   - Người bị lên giàn có 30s nói qua Mic / Chat để biện minh.
   - Cùng lúc đó, những người chơi khác có ngay 2 nút biểu quyết trực quan: **Giết (Treo Cổ)** và **Sống (Tha Bổng)**.
   - Khi hết 30s hoặc tất cả đã biểu quyết xong: Nếu số phiếu **Giết > Sống**, nghi phạm bị xử tử (kiểm tra điều kiện thắng hoặc Thợ Săn kéo theo); nếu **Sống $\ge$ Giết**, nghi phạm được tha bổng và bước vào Đêm tiếp theo.

### Visual Identity & Mobile Touch Ergonomics

- **Aesthetic Direction**: Gothic Nocturne tối giản cho Mobile — giữ nền đêm sương mù 3D chiếm trên 85% diện tích màn hình cảm ứng.
- **Color Palette & Surface Transparency**:
  - Cụm 3 nút điều khiển 3D (Joystick, Mắt, Nhảy) chuyển sang nền bán trong suốt nhẹ (`bg-[#110d19]/40` khi nghỉ, `bg-[#110d19]/65` khi chạm, viền mảnh `border-[#d4af37]/30`) để nhìn xuyên thấu cảnh vật 3D bên dưới.
- **Kích Thước & Cơ Chế 3 Nút Điều Khiển Mới**:
  - **Nút Di Chuyển (Joystick Trái)**: Thu gọn kích thước xuống `w-20 h-20` (80px trên mobile) thay vì 96px–128px trước đây, núm gạt `w-8 h-8` gọn gàng.
  - **Nút Nhảy (Góc Phải Dưới)**: Thu gọn xuống `w-11 h-11` (44px chuẩn chạm mobile), độ trong suốt cao.
  - **Nút Mắt Camera (Góc Phải Trên Nút Nhảy)**: Thu gọn xuống `w-11 h-11` (44px). Khi giữ và kéo nút Mắt theo hướng nào, góc nhìn camera sẽ xoay đúng một góc tương ứng theo hướng kéo đó (`eyeLookYaw`, `eyeLookPitch`) chứ **không xoay trôi liên tục**. Ngay khi người chơi **bỏ tay khỏi nút Mắt**, góc nhìn tự động lướt mượt (`damp`) trở về góc nhìn mặc định (`0, 0`) sau lưng nhân vật.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Tách Bước Tạo Nhân Vật 3D & Bước Chọn Phòng Trên Mobile**
  - *Chosen Approach*: Luồng 2 bước tuần tự (`step: 'character' | 'room'`) ngay trên màn hình mở đầu.
  - *Why*: Trên màn hình dọc của điện thoại, việc gộp cả khung 3D, bảng màu áo/mũ, tên nhân vật và mã phòng khiến khung 3D bị bé hoặc phải cuộn trang. Tách 2 bước giúp khung Preview 3D nhân vật hiển thị to rõ ở Bước 1, sau đó Bước 2 tập trung hoàn toàn vào Tạo Phòng Mới hoặc Nhập Mã Phòng.
- **Decision 2: Đồng Hồ Đếm Ngược Đồng Bộ Từ Server (Authoritative Phase Timer)**
  - *Chosen Approach*: Lưu `phaseEndsAt` (timestamp mili-giây) và trạng thái hoàn thành hành động trong `RoomPublicState` trên Server kèm bộ kiểm tra mỗi giây.
  - *Why*: Đảm bảo mọi người chơi trong phòng nhìn thấy cùng một số giây đếm ngược (60s Đêm, 180s Ngày, 30s Biện Minh) và tự động chuyển pha chính xác ngay khi hết giờ hoặc khi cả làng đã hoàn thành chức năng.
- **Decision 3: Nút Mắt Camera Kiểu "Free-Look Spring" (Giữ Để Liếc — Thả Tự Về Default)**
  - *Chosen Approach*: Ánh xạ trực tiếp độ lệch ngón tay trên nút Mắt `(dx, dy)` thành góc lệch tạm thời `(targetLookYaw, targetLookPitch)` thay vì cộng dồn tốc độ xoay, và đặt về `(0, 0)` khi `pointerup` / `pointercancel`.
  - *Why*: Khắc phục hoàn toàn cảm giác chóng mặt khi camera tự quay vòng vòng liên tục; giống cơ chế nút "Mắt nhìn tự do" (Free Look) chuẩn trên các game mobile 3D hiện đại.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        SERVER-SIDE ROOM STATE ENGINE                       │
│  ┌──────────────────────┐   ┌───────────────────────┐   ┌───────────────┐  │
│  │ Phase Timer Loop     │   │ Night Action Tracker  │   │ Trial & Vote  │  │
│  │ • Night: 60s         │──▶│ • Bot auto-act (2-3s) │──▶│ • Day: 180s   │  │
│  │ • Day Discuss: 180s  │   │ • All roles done?     │   │ • Trial: 30s  │  │
│  │ • Defense Trial: 30s │   │   → Auto-skip Night   │   │ • Kill / Save │  │
│  └──────────────────────┘   └───────────────────────┘   └───────────────┘  │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        │ WebSocket (room:state)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                     MOBILE-FIRST 3D CLIENT APPLICATION                     │
│                                                                            │
│  ┌──────────────────────────────┐     ┌─────────────────────────────────┐  │
│  │ 1. Two-Step Onboarding UI    │     │ 2. In-Game HUD & Phase Timers   │  │
│  │  • Step 1: 3D Avatar Studio  │────▶│  • Top Bar: Phase Countdown     │  │
│  │    + Short 1-line Subtitle   │     │    + Host Room/Role Setup       │  │
│  │  • Step 2: Create Room /     │     │  • Night Bar: 60s + Auto-Skip   │  │
│  │    Enter Room Code           │     │  • Day Bar: 180s + Blank Vote   │  │
│  └──────────────────────────────┘     │  • Trial Bar: 30s + Kill / Save │  │
│                                       └─────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 3. Compact Translucent 3D Controls & Spring-Return Camera Eye        │  │
│  │  • Compact Joystick (w-20, 40% opacity) + Jump Icon (w-11)           │  │
│  │  • Eye Button (w-11): Hold/Drag → Directional Offset (Yaw/Pitch)     │  │
│  │                       Release   → Smooth Damp Return to Default (0,0)│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Extensions

- **Mở rộng `GamePhase`**:
  - Thêm pha `'day_trial'` (Biện minh trên giàn & bỏ phiếu Giết / Sống trong 30 giây) bên cạnh `'lobby' | 'role_reveal' | 'night' | 'day_discussion' | 'day_voting' | 'ended'`.
- **Mở rộng `RoomPublicState`**:
  - `phaseEndsAt: number | null`: Thời điểm kết thúc pha hiện tại (mili-giây) để hiển thị đồng hồ đếm ngược `MM:SS` đồng bộ.
  - `nightCompletedCount: number` & `nightRequiredCount: number`: Số lượng người chơi có chức năng đêm đã thực hiện xong trên tổng số người cần thực hiện, kèm cờ `allNightActionsSubmitted: boolean`.
  - `accusedPlayerId: string | null`: ID người chơi bị bầu cao nhất bước lên giàn biện minh trong pha `'day_trial'`.
  - `trialVotes: Record<string, 'kill' | 'save'>`: Phiếu biểu quyết **Giết** hoặc **Sống** của dân làng trong 30 giây biện minh.
- **Mở rộng `MobileMovementInput`**:
  - Thay `cameraYawDelta`, `cameraPitchDelta`, `isAutoOrbit360` bằng `eyeLookYaw: number` và `eyeLookPitch: number` (góc nhìn tương đối tính bằng radian theo vị trí ngón tay giữ trên nút Mắt) và cờ `isHoldingEye: boolean`.

### Interactive Component & State Mapping

- **Luồng Onboarding 2 Bước (`TitleScreenOverlay`)**:
  - `onboardingStep === 'character'`: Hiển thị tiêu đề rút gọn, khung 3D Character Turntable trực tiếp, ô nhập tên, bộ chọn nhanh Mũ / Màu Áo / Đèn Lồng và nút **Tiếp Tục Chọn Phòng**.
  - `onboardingStep === 'room'`: Cho phép ấn **Tạo Phòng Mới** (sinh mã phòng mới và vào sảnh chờ làm Chủ Phòng) hoặc **Nhập Mã Phòng** có sẵn để vào sảnh chờ.
- **Luồng Chủ Phòng Thiết Lập Sảnh Chờ**:
  - Chỉ Chủ Phòng (`localPlayer.isHost`) mới có quyền chỉnh số lượng người chơi (5–15), cấu hình bộ bài Role và ấn **Bắt Đầu Ván Đấu** (người chơi khách có thể xem danh sách phòng và thông tin Role).
- **Luồng Đếm Ngược & Chuyển Pha Tự Động**:
  - **Khi bắt đầu ván (`role_reveal` $\rightarrow$ `night`)**: Khởi tạo `phaseEndsAt = Date.now() + 60_000`. AI Bot tự động gửi hành động sau `2.5s`. Khi tất cả người chơi có chức năng đêm đã chọn xong, tự động chuyển sang pha Ngày (hoặc bấm nút **Qua Đêm Ngay**).
  - **Pha Thảo Luận & Bỏ Phiếu (`day_discussion` / `day_voting`, 180s)**: Khởi tạo `phaseEndsAt = Date.now() + 180_000`. Người chơi chọn nhân vật 3D để bầu hoặc ấn **Bỏ Phiếu Trắng**. Khi hết 180s hoặc tất cả đã bầu:
    - Nếu có nghi phạm dẫn đầu phiếu bầu $\rightarrow$ chuyển sang `'day_trial'` với `accusedPlayerId` và `phaseEndsAt = Date.now() + 30_000`.
    - Nếu Bỏ Phiếu Trắng dẫn đầu hoặc hòa phiếu $\rightarrow$ không ai bị treo cổ, chuyển sang Đêm kế tiếp.
  - **Pha Biện Minh & Biểu Quyết (`day_trial`, 30s)**: Hiển thị tên người bị lên giàn, đồng hồ đếm ngược 30s và 2 nút **Giết (Treo Cổ)** / **Sống (Tha Bổng)** cho các người chơi khác. Hết 30s hoặc đủ phiếu sẽ tự động chốt kết quả xử tử hoặc tha bổng.
- **Luồng Nút Mắt Camera (`MobileMovementPad` + `GothicVillageScene`)**:
  - Khi giữ và kéo trên nút Mắt: `eyeLookYaw = -vec.normX * Math.PI * 0.85`, `eyeLookPitch = vec.normY * 2.4`.
  - Khi thả tay khỏi nút Mắt (`pointerup` / `pointercancel` / `lostpointercapture`): Đặt `eyeLookYaw = 0`, `eyeLookPitch = 0`, `isHoldingEye = false`. Trong vòng lặp dựng hình 3D, góc lệch camera nội suy mượt (`THREE.MathUtils.damp`) về `0` để trả lại góc nhìn mặc định phía sau lưng nhân vật.
