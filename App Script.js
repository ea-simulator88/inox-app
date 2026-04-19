function _maxPriceByMa_(srcSheet, ma) {
  if (!srcSheet || srcSheet.getLastRow() <= 1) return 0;
  return srcSheet.getDataRange().getValues().slice(1).reduce(function(best, r) {
    return (r[0] || '').toString().trim() === ma ? Math.max(best, Number(r[8]) || 0) : best;
  }, 0);
}

function doPost(e) {
  if (e.parameter.token !== 'inox2026xK9m')
    return ContentService.createTextOutput(JSON.stringify({error:'unauthorized'}));
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── ẨN / HIỆN sản phẩm (ghi cột "Ẩn") ────────────
    if (data.action === 'setHidden') {
      const spSheet = ss.getSheetByName('Sản phẩm');
      const headers = spSheet.getRange(1, 1, 1, spSheet.getLastColumn()).getValues()[0];
      const maCol = headers.indexOf('Mã SP') + 1;
      const anCol = headers.indexOf('Ẩn') + 1;
      if (maCol > 0 && anCol > 0) {
        const maData = spSheet.getRange(2, maCol, spSheet.getLastRow() - 1, 1).getValues();
        for (let i = 0; i < maData.length; i++) {
          if ((maData[i][0] || '').toString().trim() === data.ma.toString().trim()) {
            spSheet.getRange(i + 2, anCol).setValue(data.value);
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = ss.getSheetByName(data.sheet);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false, error: 'Sheet không tồn tại: ' + data.sheet
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── THÊM MỚI sản phẩm ──────────────────────────────
    if (data.action === 'add') {
      sheet.appendRow(data.row);
      const newRow = sheet.getLastRow();
      sheet.getRange(newRow, 9).setFormula(
        `=SUMIFS('Nhập'!H:H;'Nhập'!A:A;A${newRow})-SUMIFS('Xuất'!H:H;'Xuất'!A:A;A${newRow})`
      );
      sheet.getRange(newRow, 10).setFormula(
        `=IMAGE("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data="&A${newRow})`
      );
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    // ── SỬA sản phẩm theo Mã SP ────────────────────────
    if (data.action === 'update') {
      const rows = sheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0].toString().trim() === data.ma.toString().trim()) {
          data.row.forEach((val, j) => {
            // Bỏ qua cột Tồn kho (I=8) vì dùng công thức SUMIFS
            if (j !== 8) {
              sheet.getRange(i + 1, j + 1).setValue(val);
            }
          });
          // Ghi ghi chú giá vào cột L (12) nếu có thay đổi
          if (data.ghichu_gia && data.ghichu_gia.toString().trim()) {
            sheet.getRange(i + 1, 12).setValue(data.ghichu_gia);
          }
          found = true;
          break;
        }
      }
      // Ưu tiên giá cao nhất từ lịch sử vào Sản phẩm
      if (found) {
        const spSh = ss.getSheetByName('Sản phẩm');
        if (spSh) {
          const spRows = spSh.getDataRange().getValues();
          const maTrim = data.ma.toString().trim();
          for (let i = 1; i < spRows.length; i++) {
            if ((spRows[i][0] || '').toString().trim() !== maTrim) continue;
            const maxNhap = _maxPriceByMa_(ss.getSheetByName('Nhập'), maTrim);
            if (maxNhap > (Number(spRows[i][5]) || 0)) spSh.getRange(i + 1, 6).setValue(maxNhap);
            break;
          }
        }
      }
      // Ghi điều chỉnh tồn kho vào sheet Nhập hoặc Xuất
      const delta = Number(data.soluong_delta);
      if (found && !isNaN(delta) && delta !== 0) {
        const adjSheet = delta > 0 ? ss.getSheetByName('Nhập') : ss.getSheetByName('Xuất');
        if (adjSheet) {
          const dir  = delta > 0 ? 'tăng' : 'giảm';
          const note = 'Điều chỉnh tồn kho (' + dir + ' từ ' + data.sl_cu + ' → ' + data.sl_moi + ')';
          const adjRow = [
            data.ma, new Date(), data.row[1], data.row[2], data.row[3],
            data.row[4], data.row[7], Math.abs(delta), 0,
            'Điều chỉnh', '', '', note
          ];
          adjSheet.appendRow(adjRow);
          const nr = adjSheet.getLastRow();
          adjSheet.getRange(nr, 12).setFormula('=H' + nr + '*I' + nr + '+K' + nr);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: found,
        error: found ? null : 'Không tìm thấy mã: ' + data.ma
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── XÓA sản phẩm theo Mã SP ────────────────────────
    if (data.action === 'delete') {
      const rows = sheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0].toString().trim() === data.ma.toString().trim()) {
          sheet.deleteRow(i + 1);
          found = true;
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: found,
        error: found ? null : 'Không tìm thấy mã: ' + data.ma
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ── XÓA / CẬP NHẬT dòng lịch sử theo thời gian ───────
    if (data.action === 'deleteHistoryRows' || data.action === 'updateHistoryRows') {
      const targetTime = new Date(data.thoigian).getTime();
      if (!isNaN(targetTime) && sheet) {
        const vals = sheet.getDataRange().getValues();
        for (let i = vals.length - 1; i >= 1; i--) {
          const cv = vals[i][1];
          if (!cv) continue;
          const ct = cv instanceof Date ? cv.getTime() : new Date(cv).getTime();
          if (ct === targetTime) sheet.deleteRow(i + 1);
        }
      }
      if (data.action === 'updateHistoryRows' && Array.isArray(data.rows)) {
        const noteCol = data.sheet === 'Nhập' ? 13 : 14;
        data.rows.forEach(function(row, i) {
          sheet.appendRow(row);
          const nr = sheet.getLastRow();
          sheet.getRange(nr, 12).setFormula('=H' + nr + '*I' + nr + '+K' + nr);
          if (data.notes && data.notes[i]) {
            const noteCell = sheet.getRange(nr, noteCol);
            const existing = noteCell.getValue() || '';
            noteCell.setValue(existing ? existing + ' | ' + data.notes[i] : data.notes[i]);
          }
        });
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── MẶC ĐỊNH: ghi Xuất / Nhập (logic cũ) ──────────
    const rowsToWrite = data.rows || [data.row];
    rowsToWrite.forEach(function(row) {
      sheet.appendRow(row);
      const newRow = sheet.getLastRow();
      sheet.getRange(newRow, 12).setFormula('=H' + newRow + '*I' + newRow + '+K' + newRow);
    });

    // Cập nhật Giá vốn (col F=6) từ max Nhập
    if (data.sheet === 'Nhập') {
      const spSheet = ss.getSheetByName('Sản phẩm');
      if (spSheet) {
        const spData = spSheet.getDataRange().getValues();
        const maSet = {};
        rowsToWrite.forEach(function(row) { const m = (row[0] || '').toString().trim(); if (m) maSet[m] = 1; });
        Object.keys(maSet).forEach(function(ma) {
          for (let i = 1; i < spData.length; i++) {
            if ((spData[i][0] || '').toString().trim() !== ma) continue;
            const maxNhap = _maxPriceByMa_(sheet, ma);
            if (maxNhap > (Number(spData[i][5]) || 0)) { spSheet.getRange(i + 1, 6).setValue(maxNhap); spData[i][5] = maxNhap; }
            break;
          }
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false, error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function fmtDateTime(d) {
  if (!(d instanceof Date)) return d ? d.toString() : '';
  const Y  = d.getFullYear();
  const M  = String(d.getMonth() + 1).padStart(2, '0');
  const D  = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return Y + '-' + M + '-' + D + ' ' + HH + ':' + mm;
}

function doGet(e) {
  if (e.parameter.token !== 'inox2026xK9m')
    return ContentService.createTextOutput(JSON.stringify({error:'unauthorized'}));
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Xử lý login ────────────────────────────────────
  if (e.parameter.action === 'login') {
    const role = e.parameter.role;
    const pass = e.parameter.pass;
    const sheet = ss.getSheetByName('Config');
    const data = sheet.getDataRange().getValues();
    const config = {};
    data.forEach(row => config[row[0]] = row[1]);

    const correct = (role === 'owner' && pass === config['owner_pass'].toString()) ||
                    (role === 'staff'  && pass === config['staff_pass'].toString());

    return ContentService.createTextOutput(JSON.stringify({ ok: correct }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Lấy lịch sử xuất / nhập / nháp (action=history) ───────
  if (e.parameter.action === 'history') {
    const xuatSheet  = ss.getSheetByName('Xuất');
    const nhapSheet  = ss.getSheetByName('Nhập');
    const nhapDraftSheet = ss.getSheetByName('Nháp');
    const xuatData = xuatSheet && xuatSheet.getLastRow() > 1
      ? xuatSheet.getDataRange().getValues().slice(1).map(function(r) { r[1] = fmtDateTime(r[1]); return r; }) : [];
    const nhapData = nhapSheet && nhapSheet.getLastRow() > 1
      ? nhapSheet.getDataRange().getValues().slice(1).map(function(r) { r[1] = fmtDateTime(r[1]); return r; }) : [];
    const draftData = nhapDraftSheet && nhapDraftSheet.getLastRow() > 1
      ? nhapDraftSheet.getDataRange().getValues().slice(1).map(function(r) { r[1] = fmtDateTime(r[1]); return r; }) : [];
    return ContentService.createTextOutput(JSON.stringify({ xuat: xuatData, nhap: nhapData, draft: draftData }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ── Lấy danh sách sản phẩm (action=get) ────────────
  const sheet = ss.getSheetByName('Sản phẩm');
  const data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function MASP(ten, allTen, currentRow) {
  if (!ten) return "";
  const map = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
    'ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
    'ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
    'đ':'d'
  };

  function getPrefix(str) {
    let s = str.toLowerCase();
    for (const [k,v] of Object.entries(map)) s = s.replaceAll(k,v);
    return s.trim().split(/\s+/)[0].slice(0,3).toUpperCase();
  }

  const myPrefix = getPrefix(ten);

  // Đếm số lần prefix này xuất hiện từ đầu đến dòng hiện tại
  const rows = allTen.flat();
  let count = 0;
  for (let i = 0; i < currentRow; i++) {
    if (rows[i] && getPrefix(String(rows[i])) === myPrefix) count++;
  }

  return myPrefix + String(count).padStart(3,'0');
}

function onEdit(e) {
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  if (sheetName !== 'Xuất' && sheetName !== 'Nhập') return;

  const row = e.range.getRow();
  if (row <= 1) return;

  const col = e.range.getColumn();
  const noteCol = sheetName === 'Nhập' ? 13 : 14; // Nhập=M(13), Xuất=N(14)
  if (col === noteCol) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colName = headers[col - 1] || ('Cột ' + col);

  const oldVal = (e.oldValue !== undefined && e.oldValue !== null) ? e.oldValue.toString() : '';
  const newVal = (e.value   !== undefined && e.value   !== null) ? e.value.toString()   : '';
  const dateStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');

  const noteCell = sheet.getRange(row, noteCol);
  const existingNote = noteCell.getValue() || '';

  const prefix = 'Sửa ' + colName + ':';
  const allEntries = existingNote ? existingNote.split(' | ') : [];
  const thisCol  = allEntries.filter(function(x) { return x.startsWith(prefix); });
  const otherCol = allEntries.filter(function(x) { return !x.startsWith(prefix); });

  // Tìm baseline = giá trị gốc trước lần sửa đầu tiên của cột này
  var baseline = oldVal;
  if (thisCol.length > 0) {
    var m = thisCol[0].match(/: (.+)→/);
    if (m) baseline = m[1];
  }

  var finalEntries;
  if (newVal === '' || newVal === baseline) {
    // Xóa cell hoặc revert về giá trị gốc → loại bỏ note của cột này
    finalEntries = otherCol;
  } else {
    // Thay đổi thực sự → ghi/cập nhật entry (luôn so với baseline gốc)
    finalEntries = otherCol.concat(['Sửa ' + colName + ': ' + baseline + '→' + newVal + '; ' + dateStr]);
  }

  noteCell.setValue(finalEntries.join(' | '));
}
