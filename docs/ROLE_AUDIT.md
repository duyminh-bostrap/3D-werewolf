# Rà soát vai trò — 31/10/2026

Đối chiếu đường xử lý server thật với metadata và giao diện. Các kiểm thử dưới đây xác nhận cơ chế hiện có; không tự thay đổi luật cho những biến thể chưa chốt.

| Vai | Cơ chế đã kiểm tra |
|---|---|
| Ma Sói | Phiếu chọn con mồi sống ngoài bầy; không chọn bản thân/đồng đội |
| Sói Đầu Đàn | Hóa sói một lần, đúng con mồi được bầy chọn; bảo vệ/cứu ngăn hóa |
| Sói Trắng | Hành động riêng giết sói khác; có thể thắng một mình |
| Bán Sói | Chưa hóa không tham gia đêm; bị cắn thì hóa; được bảo vệ không hóa |
| Tiên Tri | Mục tiêu sống khác mình; kết quả riêng từng người soi |
| Tiên Tri Hào Quang | Hiển thị có chức năng/dân thường, không còn nhãn Tà/Dân sai ý nghĩa |
| Bảo Vệ | Mục tiêu riêng, được bảo vệ mình; không lặp mục tiêu của chính mình hai đêm liên tiếp |
| Phù Thủy | Thuốc riêng từng người; mỗi đêm xác nhận một hành động; chỉ tiêu thuốc cứu nếu thực sự cứu con mồi cuối cùng |
| Thợ Săn | Mục tiêu riêng; báo thù cả khi chết đêm và xử ban ngày; giải quyết chuỗi Hunter/người tình |
| Thần Tình Ái | Chỉ đêm đầu; hai mục tiêu sống khác nhau; người tình chết theo |
| Già Làng | Chịu được lần cắn đầu; lần sau chết; độc không bị lá chắn chặn |
| Cô Bé | Server tạo manh mối mơ hồ giữa một sói và một người khác, chỉ gửi người rình |
| Thị Trưởng | Phiếu hệ số hai khi đề cử và khi xét xử |
| Thằng Ngố | Chỉ thắng riêng khi bị xử tử; bị giết ban đêm không thắng |
| Dân Làng | Không có chức năng đêm; người chết hoặc đã xác nhận không hành động lại |

## Các lỗi đã sửa

Kết quả soi và lựa chọn của nhiều người cùng vai không còn ghi đè nhau. Thuốc, bảo vệ đêm trước và mục tiêu báo thù tách theo người chơi. Người chơi và bot dùng chung bộ kiểm tra hành động trước khi khóa xác nhận. Thợ Săn thực hiện được báo thù ban ngày, kể cả chuỗi liên tiếp. Cô Bé không còn tự suy manh mối từ role ở client.

Tử vong có thời điểm ngày/đêm và số vòng được ghi nhận trên server. Camera focus đi kèm vòng hiệu ứng cam ban ngày/tím ban đêm và nhãn thời điểm; thông báo chat ghi rõ Ngày/Đêm. Hiệu ứng được xóa khi về lobby.

Recap được lưu theo từng đêm, kèm phiên xử ban ngày tiếp theo; chỉ gửi sau khi ván kết thúc và xóa khi reset. Màn kết quả có thể mở/thu từng đêm. Đây là diễn biến thực tế, không phải đoạn văn tự tạo từ số vòng.

## Bằng chứng

- `src/game/roleAudit.test.ts`: cơ chế 15 role và kiểm tra biên.
- `src/game/deathPresentation.test.ts`: thời điểm chết không phụ thuộc pha hiện tại.
- `role-flow-test.cjs`: 15 kết nối thật kiểm tra kết quả riêng/thuốc/manh mối, kết thúc, recap và reset; ván thứ hai kiểm tra chuỗi Hunter ban ngày và recap hai đêm. Chạy với server riêng cổng 3112.
- HUD kiểm tra ở 320, 390, 430px: hai hàng cố định, các ô hàng dưới cùng cao 44px, khoảng cách 8px; không tràn ngang. Không hiện số tim/đá.

## Giới hạn còn mở

Các P0 trong `GAMEPLAY_SPEC.md` vẫn còn: role trong payload công khai, ID client chưa xác thực, một số quyền host và tham gia giữa ván. Vì vậy kiểm tra role đạt không đồng nghĩa đủ an toàn để phát hành công khai.

Luật hiện có cần chủ sản phẩm chốt nếu muốn đổi: Sói Trắng vẫn có thể thắng theo phe Sói; hòa phiếu Sói phụ thuộc thứ tự phiếu; không còn ai sống đang tính Dân thắng; Bán Sói nằm nhóm bài Sói nhưng chưa hóa được tính phía làng. Witch cứu một mục tiêu đã chọn, không tự chuyển thuốc sang con mồi khác khi bầy thay phiếu.

Chưa kiểm tra hiệu ứng trên điện thoại thật, một ván người thật có voice, hoặc OAuth Google/Apple.
