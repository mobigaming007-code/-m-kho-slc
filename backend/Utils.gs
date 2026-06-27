function output(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}

function sendSuccess(data) {
  return { success: true, data: data || {} };
}

function sendError(message) {
  return { success: false, error: message || 'Unknown error' };
}

function getSheetRequired(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Không tìm thấy sheet: ' + name);
  }
  return sheet;
}

function cleanHeader(value) {
  return String(value || '').trim();
}

function getRowsObject(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(cleanHeader);

  return values.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i];
      });
      return obj;
    });
}

function appendObject(sheet, obj) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(cleanHeader);

  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function hashText(text) {
  return Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      text
    )
  );
}

function createSessionToken(email) {
  const raw = email + '|' + new Date().getTime() + '|' + Math.random();
  return Utilities.base64EncodeWebSafe(raw);
}

function getSheet(ss, name) {
  const sheet = ss.getSheetByName(name);

  if (!sheet) {
    throw new Error('Không tìm thấy sheet: ' + name);
  }

  return sheet;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function hashText(text) {
  return Utilities.base64Encode(
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      text
    )
  );
}

function createSessionToken(email) {
  return Utilities.base64EncodeWebSafe(
    email + '|' + new Date().getTime()
  );
}

function appendObject(sheet, obj) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0];

  const row = headers.map(h =>
    obj[h] !== undefined ? obj[h] : ''
  );

  sheet.appendRow(row);
}

function getRowsObject(sheet) {
  const values = sheet.getDataRange().getValues();

  if (values.length < 2) return [];

  const headers = values[0];

  return values.slice(1).map(row => {
    const obj = {};

    headers.forEach((h, i) => {
      obj[h] = row[i];
    });

    return obj;
  });
}

function generateId(prefix) {
  const now = new Date();
  const date = Utilities.formatDate(
    now,
    Session.getScriptTimeZone(),
    'yyyyMMdd'
  );
  const rand = Math.floor(1000 + Math.random() * 9000);
  return prefix + '-' + date + '-' + rand;
}