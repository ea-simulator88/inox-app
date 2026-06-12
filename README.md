# App xuất nhập hàng inox

Ứng dụng web quản lý hàng inox, kết nối Google Sheets thông qua Google Apps Script. App hỗ trợ bán hàng, nhập hàng, quản lý sản phẩm, lịch sử giao dịch, công nợ, báo cáo và in hóa đơn.

## Quy tắc bắt buộc trước khi sửa

- Mỗi lần sửa bất kỳ file nào trong folder này, phải mở và đọc `README.md` trước.
- Mỗi lần sửa xong phải ghi lại vào nhật kí `CHANGELOG.md` với thời gian định dạng `yyyy-mm-dd hh:mm:ss`,ghi nhật kí sửa thứ tự từ cũ tới mới .
- `README.md` và `CHANGELOG.md` phải viết tiếng Việt có dấu đàng hoàng, lưu bằng UTF-8, trừ tên biến/tên file/tên sheet cần giữ nguyên.
- Chỉ sửa đúng yêu cầu. Không đụng những phần khác nếu không cần thiết.
- Nếu thấy cần sửa lớn, thay đổi luồng nghiệp vụ, cấu trúc dữ liệu, giao diện lớn, Apps Script, hoặc hành vi có thể ảnh hưởng nhiều màn hình thì phải giải thích và hỏi trước khi sửa.
- Không xóa hoặc revert thay đổi của người khác nếu không được yêu cầu rõ.

## Cấu trúc file trong folder

- `index.html`: giao diện chính của ứng dụng, gồm các màn hình đăng nhập, trang chính, giỏ hàng, form nhập/xuất, sản phẩm, lịch sử, chi tiết lịch sử, báo cáo, modal công nợ, modal hóa đơn, modal sửa lịch sử.
- `app.js`: logic frontend của ứng dụng: đăng nhập, phân quyền, sản phẩm, giỏ hàng, nhập/xuất, nhập nhanh desktop, lịch sử, công nợ, báo cáo, hóa đơn, đơn draft, cache, refresh và đồng bộ Google Sheets.
- `style.css`: style giao diện, responsive mobile/desktop, card lịch sử, nút, modal, layout màn hình.
- `App Script.js`: backend Google Apps Script, đọc/ghi Google Sheets, đăng nhập, người dùng, sản phẩm, lịch sử, nhập/xuất/draft, công nợ, backup.
- `appsscript.json`: cấu hình Google Apps Script.
- `update.bat`: script hỗ trợ cập nhật/deploy theo môi trường hiện tại.
- `qr-zalo.png`: ảnh QR Zalo dùng trong ứng dụng.
- `lucky-cat.png`: ảnh tài nguyên dùng trong ứng dụng.
- `README.md`: tài liệu tổng quan, quy tắc sửa đổi và danh sách tính năng.
- `CHANGELOG.md`: nhật ký các lần sửa, bắt buộc ghi thời gian `yyyy-mm-dd hh:mm:ss`.

## Tính năng chính

### Đăng nhập và phân quyền

- Đăng nhập bằng mật khẩu từ Google Sheets.
- Hỗ trợ vai trò `owner` và `staff`.
- Hiện badge người dùng trên các màn hình.
- Phân quyền owner/staff cho các chức năng quản lý, báo cáo, lịch sử, sửa/xóa.
- Tự động đăng xuất sau thời gian không thao tác.
- Kiểm tra realtime danh sách người dùng để tránh dùng cache sai.

### Quản lý người dùng

- Owner có thể thêm, sửa, xóa người dùng.
- Lưu tên, mật khẩu và vai trò người dùng trên Google Sheets.

### Quản lý sản phẩm

- Tải danh sách sản phẩm từ sheet `Sản phẩm`.
- Cache sản phẩm trong trình duyệt để mở nhanh.
- Làm mới nhanh giá, tồn kho và sản phẩm mới.
- Tìm kiếm theo mã, NCC, tên, giá vốn, giá sỉ, tồn kho.
- Lọc sản phẩm đang hiện, đang ẩn, tồn thấp.
- Sắp xếp/lọc tồn kho theo nhu cầu giao diện.
- Thêm, sửa, xóa sản phẩm.
- Ẩn/hiện sản phẩm bằng cột trạng thái ẩn.
- Cập nhật tồn kho và giá vốn/giá sỉ theo luồng nghiệp vụ hiện có.
- Cảnh báo tồn kho thấp.

### Quét và tìm sản phẩm

- Quét QR/barcode để tìm sản phẩm.
- Nhập mã thủ công.
- Lưu lịch sử tìm kiếm riêng cho các khu vực mobile, desktop, quản lý, lịch sử và báo cáo.
- Highlight từ khóa tìm kiếm trên kết quả.

### Giỏ hàng mobile

- Chọn chế độ `Xuất` hoặc `Nhập`.
- Thêm nhiều sản phẩm vào giỏ.
- Nhập số lượng, đơn giá, phí vận chuyển, phí khách trả, khách nợ, nợ NCC, ghi chú.
- Cảnh báo vượt tồn khi xuất.
- Cảnh báo giá bán thấp hơn giá sỉ cho owner.
- Lưu giỏ hàng vào localStorage.
- Xác nhận ghi vào sheet `Xuất` hoặc `Nhập`.
- Lưu đơn `Nhập`/`Xuất` vào lịch sử local ngay sau khi thao tác.

### Nhập nhanh desktop

- Giao diện desktop riêng cho thao tác nhập/xuất nhiều sản phẩm.
- Tìm, lọc, thêm sản phẩm vào giỏ desktop.
- Chọn chế độ `Xuất` hoặc `Nhập`.
- Nhập thông tin giao dịch, phí, nợ, ghi chú.
- Lưu nhập và xuất vào Google Sheets.
- Hỗ trợ lưu đơn draft theo luồng hiện có.

### Đơn draft

- Lưu đơn tạm vào sheet draft theo cấu trúc hiện có của app.
- Xác nhận đơn draft thành `Xuất`.
- Kiểm tra tồn kho trước khi xuất đơn draft.
- Có nút xuất nhanh từ danh sách lịch sử và chi tiết lịch sử.

### Lịch sử giao dịch

- Tải lịch sử từ các sheet `Xuất`, `Nhập` và sheet draft.
- Lọc theo loại: Tất cả, Nhập, Xuất, Draft.
- Lọc theo thời gian: tất cả, hôm nay, hôm qua, tuần này, tháng này, năm nay, tùy chọn ngày.
- Tìm kiếm theo mã, NCC, tên khách, hàng hóa hoặc tất cả.
- Sắp xếp mới/cũ, A-Z/Z-A.
- Gom dòng thành từng đơn theo thời gian và đối tượng.
- Hiện tổng số lượng, số đơn, tổng tiền, phí vận chuyển, phí khách trả.
- Xem chi tiết từng đơn.
- Sửa đơn lịch sử và cập nhật local ngay để tránh phải làm mới nhiều lần.
- Xóa đơn lịch sử.
- Cache lịch sử và pending update để trải nghiệm nhanh hơn.

### Sửa lịch sử

- Sửa mã sản phẩm, số lượng, giá, giao dịch, tên khách/NCC, phí, nợ, ghi chú.
- Thêm/xóa dòng sản phẩm trong đơn.
- Kiểm tra vượt tồn khi sửa đơn xuất hoặc đơn nhập.
- Cảnh báo giá bán thấp hơn giá sỉ.
- Ghi chú thay đổi tự động vào lịch sử.
- Gửi update lên Apps Script bằng `updateHistoryRows`.
- Cập nhật giao diện ngay sau khi lưu.

### Công nợ

- Tổng hợp `Nợ NCC` từ đơn nhập.
- Tổng hợp `Khách Nợ` từ đơn xuất.
- Tab riêng cho nhập và xuất.
- Xem chi tiết công nợ theo NCC/khách.
- Đánh dấu `Đã trả` từng dòng nợ.
- Cập nhật nợ local ngay và gửi lên Apps Script bằng `clearDebtRow`.
- Preload công nợ sau khi lịch sử load để mở modal nhanh hơn.

### Báo cáo

- Báo cáo owner theo loại giao dịch và khoảng thời gian.
- Lọc theo Tất cả/Nhập/Xuất.
- Lọc ngày và tìm kiếm.
- Tổng hợp theo nhà cung cấp, khách hàng, sản phẩm.
- Xem chi tiết đơn trong báo cáo.
- Sắp xếp mới/cũ, A-Z/Z-A.
- Có khu vực phân tích/biểu đồ theo cấu trúc hiện có.
- Xuất sổ doanh thu theo modal hiện có.

### Hóa đơn

- Tạo hóa đơn từ đơn xuất.
- Cho chọn bản đầy đủ giá và/hoặc bản không giá.
- Tách trang hóa đơn theo số dòng.
- Lấy địa chỉ, số điện thoại khách từ danh sách khách hàng.
- Hỗ trợ in hóa đơn.

### Khách hàng

- Tải danh sách khách hàng từ Apps Script.
- Dùng thông tin khách để điền địa chỉ/SĐT trên hóa đơn.
- Cache dữ liệu khách hàng trong thời gian ngắn để tăng tốc.

### Đồng bộ Google Sheets

- Frontend gọi `SCRIPT_URL` để đọc/ghi dữ liệu.
- Apps Script xử lý sheet `Sản phẩm`, `Xuất`, `Nhập`, sheet draft, user và khách hàng.
- Hỗ trợ backup spreadsheet.
- Sử dụng request id để hạn chế lặp request lịch sử.
- Tạm thời gỡ bỏ filter của sheet khi cần ghi/xóa để tránh lỗi.

### Cache và trải nghiệm nhanh

- Cache sản phẩm, lịch sử, giỏ hàng, đăng nhập và lịch sử tìm kiếm.
- Refresh nhanh sản phẩm bằng API `getFast`.
- Auto refresh sản phẩm khi app đang mở.
- Render từ cache trước, fetch server sau với một số màn hình.
- Giữ pending update của lịch sử để tránh server chậm làm hiện lại dữ liệu cũ.

## Ghi chú phát triển

- Ứng dụng hiện là HTML/CSS/JavaScript thuần, không có build step frontend.
- Backend là Google Apps Script, không phải server Node.
- Khi sửa frontend, ưu tiên giữ đúng pattern hiện có trong `app.js`.
- Khi sửa Apps Script, cần cẩn thận với cột Google Sheets vì mỗi sheet có số cột và công thức riêng.
- Nếu thay đổi cấu trúc cột, phải hỏi trước.
- Nếu sửa logic liên quan tồn kho, công nợ, lịch sử, xóa/sửa đơn, phải giải thích tác động và hỏi trước nếu thay đổi lớn.
