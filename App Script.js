function _maxPriceByMa_(srcSheet, ma) {
  if (!srcSheet || srcSheet.getLastRow() <= 1) return 0;
  return srcSheet.getDataRange().getValues().slice(1).reduce(function(best, r) {
    return (r[0] || '').toString().trim() === ma ? Math.max(best, Number(r[8]) || 0) : best;
  }, 0);
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _getCfgUsers(ss) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('cfg_users');
  if (cached) return JSON.parse(cached);
  const cfg = ss.getSheetByName('Config');
  if (!cfg) return [];
  const lastRow = cfg.getLastRow();
  if (lastRow <= 1) return [];
  const users = cfg.getRange(2, 1, lastRow - 1, 3).getValues()
    .filter(r => r[0] || r[1] || r[2])
    .map(r => ({ ten: String(r[0]).trim(), matkhau: String(r[1]).trim(), vaitro: String(r[2]).trim() }));
  cache.put('cfg_users', JSON.stringify(users), 60);
  return users;
}

function _clearCfgUsersCache_() {
  CacheService.getScriptCache().remove('cfg_users');
}

function doPost(e) {
  if (e.parameter.token !== 'inox2026xK9m')
    return _json({ error: 'unauthorized' });
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── Thêm user ──────────────────────────────────────
    if (data.action === 'addUser') {
      const cfg = ss.getSheetByName('Config');
      if (!cfg) return _json({ ok: false, error: 'Sheet Config không tồn tại' });
      cfg.appendRow([data.ten, data.matkhau, data.vaitro]);
      _clearCfgUsersCache_();
      return _json({ ok: true });
    }

    // ── Sửa user ───────────────────────────────────────
    if (data.action === 'updateUser') {
      const cfg = ss.getSheetByName('Config');
      if (!cfg) return _json({ ok: false, error: 'Sheet Config không tồn tại' });
      const vals = cfg.getDataRange().getValues();
      for (let i = 1; i < vals.length; i++) {
        if (String(vals[i][0]).trim() === String(data.oldTen).trim()) {
          cfg.getRange(i + 1, 1, 1, 3).setValues([[data.ten, data.matkhau, data.vaitro]]);
          _clearCfgUsersCache_();
          return _json({ ok: true });
        }
      }
      return _json({ ok: false, error: 'Không tìm thấy user: ' + data.oldTen });
    }

    // ── Xóa user ───────────────────────────────────────
    if (data.action === 'deleteUser') {
      const cfg = ss.getSheetByName('Config');
      if (!cfg) return _json({ ok: false, error: 'Sheet Config không tồn tại' });
      const vals = cfg.getDataRange().getValues();
      for (let i = 1; i < vals.length; i++) {
        if (String(vals[i][0]).trim() === String(data.ten).trim()) {
          cfg.deleteRow(i + 1);
          _clearCfgUsersCache_();
          return _json({ ok: true });
        }
      }
      return _json({ ok: false, error: 'Không tìm thấy user: ' + data.ten });
    }

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
      let adjustedGiaVon = 0;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0].toString().trim() === data.ma.toString().trim()) {
          const newGiaVon = Number(data.row && data.row[5]);
          const oldGiaVon = Number(rows[i][5]);
          adjustedGiaVon = !isNaN(newGiaVon) ? newGiaVon : (!isNaN(oldGiaVon) ? oldGiaVon : 0);
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
          const giaDieuChinh = Number(adjustedGiaVon) || 0;
          const ts = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
          const _adjIsX = adjSheet.getName() === 'Xuất';
          // Xuất: A-K=data, L=phiKT(empty), M=formula, N=tenkhach(empty), O=note
          // Nhập: A-K=data, L=formula,       M=note
          const adjRow = _adjIsX
            ? [data.ma, ts, data.row[1], data.row[2], data.row[3], data.row[4], data.row[7], Math.abs(delta), giaDieuChinh, '', '', '', '', '', note]
            : [data.ma, ts, data.row[1], data.row[2], data.row[3], data.row[4], data.row[7], Math.abs(delta), giaDieuChinh, '', '', '', note];
          adjSheet.appendRow(adjRow);
          const nr = adjSheet.getLastRow();
          adjSheet.getRange(nr, _adjIsX ? 13 : 12).setFormula('=H' + nr + '*I' + nr + '+K' + nr + (_adjIsX ? '+L' + nr : ''));
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
      const targetTimeKey = _historyTimeKey(data.thoigian);
      if (targetTimeKey && sheet) {
        const matchCounts = {};
        if (Array.isArray(data.matchRows)) {
          data.matchRows.forEach(function(row) {
            const sig = _historyMatchSignature_(data.sheet, row);
            if (sig) matchCounts[sig] = (matchCounts[sig] || 0) + 1;
          });
        }
        const vals = sheet.getDataRange().getValues();
        const dvals = sheet.getDataRange().getDisplayValues();

        // Thu thập các dòng cần xóa (vòng lặp ngược → mảng đã theo thứ tự giảm dần)
        const rowsToDelete = [];
        for (let i = vals.length - 1; i >= 1; i--) {
          const cv = dvals[i][1] || vals[i][1];
          if (!cv) continue;
          if (_historyTimeKey(cv) !== targetTimeKey) continue;
          if (!Array.isArray(data.matchRows) || data.matchRows.length === 0) {
            rowsToDelete.push(i + 1);
            continue;
          }
          const sig = _historyMatchSignature_(data.sheet, vals[i]);
          if (matchCounts[sig] > 0) {
            rowsToDelete.push(i + 1);
            matchCounts[sig]--;
          }
        }

        // Gom các dòng liên tiếp → xóa 1 lần thay vì từng dòng
        let j = 0;
        while (j < rowsToDelete.length) {
          let count = 1;
          while (j + count < rowsToDelete.length && rowsToDelete[j + count] === rowsToDelete[j] - count) count++;
          sheet.deleteRows(rowsToDelete[j + count - 1], count);
          j += count;
        }
      }
      if (data.action === 'updateHistoryRows' && Array.isArray(data.rows)) {
        const noteCol = data.sheet === 'Nhập' ? 13 : 15;
        const _isXuatUpd = data.sheet === 'Xuất' || data.sheet === 'Nháp';
        const preparedRows = data.rows.map(function(row, i) {
          const r = row.slice();
          if (data.sheet === 'Nhập') {
            r.length = 13; // Cắt bỏ các cột thừa, chỉ giữ đúng 13 cột (A -> M) của sheet Nhập
          }
          if (data.notes && data.notes[i]) {
            while (r.length < noteCol) r.push('');
            const existing = r[noteCol - 1] || '';
            r[noteCol - 1] = existing ? existing + ' | ' + data.notes[i] : data.notes[i];
          }
          return r;
        });

        if (preparedRows.length > 0) {
          const maxCols = preparedRows.reduce(function(m, r) { return Math.max(m, r.length); }, 0);
          preparedRows.forEach(function(r) { while (r.length < maxCols) r.push(''); });

          const startRow = sheet.getLastRow() + 1;
          sheet.getRange(startRow, 1, preparedRows.length, maxCols).setValues(preparedRows);

          const formulaCol = _isXuatUpd ? 13 : 12;
          const formulas = preparedRows.map(function(_, i) {
            const nr = startRow + i;
            return ['=H' + nr + '*I' + nr + '+K' + nr + (_isXuatUpd ? '+L' + nr : '')];
          });
          sheet.getRange(startRow, formulaCol, formulas.length, 1).setFormulas(formulas);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ── MẶC ĐỊNH: ghi Xuất / Nhập / Nháp ──────────────────
    const rowsToWrite = data.rows || [data.row];
    const _isXuatOrDraft = data.sheet === 'Xuất' || data.sheet === 'Nháp';

    // Chuẩn bị tất cả rows (padding + user_name)
    const preparedRows = rowsToWrite.map(function(row) {
      const r = row.slice();
      if (_isXuatOrDraft) {
        while (r.length < 15) r.push('');
        r[15] = data.user_name || '';
      }
      return r;
    });

    // Chuẩn hóa độ rộng (setValues yêu cầu hình chữ nhật)
    const maxCols = preparedRows.reduce(function(m, r) { return Math.max(m, r.length); }, 0);
    preparedRows.forEach(function(r) { while (r.length < maxCols) r.push(''); });

    // Ghi tất cả dòng 1 lần + set công thức 1 lần
    const formulaCol = _isXuatOrDraft ? 13 : 12;
    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, preparedRows.length, maxCols).setValues(preparedRows);
    const formulas = preparedRows.map(function(_, i) {
      const nr = startRow + i;
      return ['=H' + nr + '*I' + nr + '+K' + nr + (_isXuatOrDraft ? '+L' + nr : '')];
    });
    sheet.getRange(startRow, formulaCol, formulas.length, 1).setFormulas(formulas);

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
            const oldGiaVon = Number(spData[i][5]) || 0;
            if (maxNhap > oldGiaVon) {
              spSheet.getRange(i + 1, 6).setValue(maxNhap);
              spData[i][5] = maxNhap;

              const dateStr = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
              const note = 'Giá vốn: ' + oldGiaVon + '→' + maxNhap + ' (' + dateStr + ')';
              const noteCell = spSheet.getRange(i + 1, 12); // Cột L
              const existing = (noteCell.getValue() || '').toString().trim();
              noteCell.setValue(existing ? (existing + ' | ' + note) : note);
            }
            break;
          }
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return _json({ success: false, error: err.message });
  }
}

function fmtDateTime(d) {
  if (!d) return '';
  if (d instanceof Date) {
    return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  }

  const s = String(d).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?)/);
  if (m) return m[1];

  const parsed = new Date(s);
  return isNaN(parsed.getTime())
    ? s
    : Utilities.formatDate(parsed, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

function _historyTimeKey(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
  }

  const s = String(v).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  if (m) return m[1];

  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

function _historyMatchSignature_(sheetName, row) {
  if (!row) return '';

  const getVal = function(src, idx, key) {
    if (Array.isArray(src)) return src[idx];
    return src[key];
  };

  const parts = [
    getVal(row, 0, 'ma'),
    getVal(row, 2, 'ncc'),
    getVal(row, 3, 'hanghoa'),
    getVal(row, 4, 'kichthuoc'),
    getVal(row, 5, 'mota'),
    getVal(row, 6, 'dvt'),
    Number(getVal(row, 7, 'soluong')) || 0,
    Number(getVal(row, 8, 'gia')) || 0,
    getVal(row, 9, 'giaodich')
  ];

  if (sheetName === 'Xuất') {
    // ghichu (col 14) excluded: updateHistoryRows appends edit notes into that cell → mismatch after edit. //
    parts.push(
      Number(getVal(row, 10, 'phichanh')) || 0,
      Number(getVal(row, 11, 'phikhachtra')) || 0,
      getVal(row, 13, 'tenkhach'),
      getVal(row, 15, 'nguoighi')
    );
  } else if (sheetName === 'Nháp') {
    // ghichu excluded: updateHistoryRows appends edit notes into that cell → mismatch after edit.
    // phichanh/phikhachtra excluded: sign/format differences cause mismatches in some flows.
    // tenkhach + 9 base fields + second-precision timestamp are unique enough
    parts.push(
      getVal(row, 13, 'tenkhach')
    );
  } else {
    // Nhập: ghichu (col 12) excluded for same reason — notes appended there after edit.
    parts.push(
      Number(getVal(row, 10, 'phichanh')) || 0
    );
  }

  return parts.map(function(v) { return (v || '').toString().trim(); }).join('||');
}

function _historyRowsFromSheet_(sheet) {
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const values = sheet.getDataRange().getValues().slice(1);
  const displays = sheet.getDataRange().getDisplayValues().slice(1);
  return values.map(function(r, i) {
    const out = r.slice();
    out[1] = (displays[i] && displays[i][1]) ? displays[i][1] : fmtDateTime(r[1]);
    return out;
  });
}

function doGet(e) {
  if (e.parameter.token !== 'inox2026xK9m')
    return ContentService.createTextOutput(JSON.stringify({error:'unauthorized'}));
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Lấy danh sách users (action=getUsers) ──────────
  if (e.parameter.action === 'getUsers') {
    try {
      return _json({ ok: true, users: _getCfgUsers(ss) });
    } catch(ex) {
      return _json({ ok: false, error: ex.message });
    }
  }

  // ── Xử lý login (action=login) — giữ tương thích ───
  if (e.parameter.action === 'login') {
    const role = e.parameter.role;
    const pass = e.parameter.pass;
    const users = _getCfgUsers(ss);
    const ok = users.some(u => u.vaitro === role && u.matkhau === pass);
    return _json({ ok });
  }

  // ── Lấy lịch sử xuất / nhập / nháp (action=history) ───────
  if (e.parameter.action === 'history') {
    const xuatSheet  = ss.getSheetByName('Xuất');
    const nhapSheet  = ss.getSheetByName('Nhập');
    const nhapDraftSheet = ss.getSheetByName('Nháp');
    const xuatData = _historyRowsFromSheet_(xuatSheet);
    const nhapData = _historyRowsFromSheet_(nhapSheet);
    const draftData = _historyRowsFromSheet_(nhapDraftSheet);
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
  const noteCol = sheetName === 'Nhập' ? 13 : 15; // Nhập=M(13), Xuất=O(15) sau khi thêm cột L Phí(KT)
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
