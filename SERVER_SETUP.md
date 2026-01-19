# 🛠️ Google Apps Script (백엔드) - 컬럼 기반 최적화 버전

데이터가 시트에 정상적으로 저장되고 읽히도록, **JSON 방식이 아닌 일반 엑셀(행/열) 방식**으로 코드를 변경했습니다.
아래 코드를 복사하여 Apps Script(`Code.gs`)에 붙여넣으세요.

## 1. Apps Script 코드 (Code.gs)

```javascript
/**
 * Project Vacation Calendar Backend (Column Based)
 * 데이터 구조:
 * - Employees: [id, name, startDate, endDate, manMonths, totalVacationDays]
 * - Vacations: [id, employeeId, date, type, cost]
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  // 동시성 제어를 위해 30초 대기 (쓰기 충돌 방지)
  try {
    lock.waitLock(30000);
  } catch (e) {
    return responseJSON({ error: 'Server is busy. Try again.' });
  }

  try {
    var params = e.parameter || {};
    var postData = null;
    
    // POST 데이터 파싱
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
        for (var key in postData) {
          params[key] = postData[key];
        }
      } catch (jsonErr) {}
    }

    var action = params.action;
    var result = { status: 'success' };
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 시트 초기화 (없으면 생성 및 헤더 추가)
    initSheets(ss);

    if (action === 'getEmployees') {
      result = getSheetData(ss, 'Employees', ['id', 'name', 'startDate', 'endDate', 'manMonths', 'totalVacationDays']);
    } 
    else if (action === 'saveEmployee') {
      saveRowData(ss, 'Employees', params.payload, 0); // 0 = ID index
    } 
    else if (action === 'deleteEmployee') {
      deleteRowData(ss, 'Employees', params.id, 0);
      deleteVacationsByEmpId(ss, params.id);
    } 
    else if (action === 'getVacations') {
      result = getSheetData(ss, 'Vacations', ['id', 'employeeId', 'date', 'type', 'cost']);
    } 
    else if (action === 'addVacation') {
      saveRowData(ss, 'Vacations', params.payload, 0);
    } 
    else if (action === 'removeVacation') {
      deleteRowData(ss, 'Vacations', params.id, 0);
    }
    else {
      // 기본 상태 체크
      result = { message: "Server is running. Actions: getEmployees, saveEmployee..." };
    }

    return responseJSON(result);

  } catch (err) {
    return responseJSON({ error: err.toString(), stack: err.stack });
  } finally {
    lock.releaseLock();
  }
}

// --- Helper Functions ---

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function initSheets(ss) {
  var sheets = [
    { name: 'Employees', header: ['id', 'name', 'startDate', 'endDate', 'manMonths', 'totalVacationDays'] },
    { name: 'Vacations', header: ['id', 'employeeId', 'date', 'type', 'cost'] }
  ];

  sheets.forEach(function(info) {
    var sheet = ss.getSheetByName(info.name);
    if (!sheet) {
      sheet = ss.insertSheet(info.name);
      sheet.appendRow(info.header); // 헤더 추가
    }
  });
}

function formatDate(date) {
  if (!date) return '';
  // 이미 문자열이면 그대로 반환 (YYYY-MM-DD 형식 가정)
  if (typeof date === 'string') return date;
  // Date 객체면 포맷팅
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function getSheetData(ss, sheetName, columns) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // 헤더만 있거나 비어있음

  // 전체 데이터 가져오기 (헤더 제외)
  var values = sheet.getRange(2, 1, lastRow - 1, columns.length).getValues();
  
  return values.map(function(row) {
    var obj = {};
    columns.forEach(function(col, index) {
      var val = row[index];
      // 날짜 필드인 경우 포맷팅 (이름에 date가 포함되면)
      if (col.toLowerCase().indexOf('date') !== -1) {
        val = formatDate(val);
      }
      obj[col] = val;
    });
    return obj;
  });
}

function saveRowData(ss, sheetName, payload, idIndex) {
  var sheet = ss.getSheetByName(sheetName);
  var lastRow = sheet.getLastRow();
  var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  
  // payload를 배열로 변환 (순서 보장 필요)
  var rowData = [];
  if (sheetName === 'Employees') {
    rowData = [
      payload.id, 
      payload.name, 
      payload.startDate, 
      payload.endDate, 
      payload.manMonths, 
      payload.totalVacationDays
    ];
  } else if (sheetName === 'Vacations') {
    rowData = [
      payload.id,
      payload.employeeId,
      payload.date,
      payload.type,
      payload.cost
    ];
  }

  // ID로 기존 행 찾기 (Update)
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] == payload.id) {
      sheet.getRange(i + 2, 1, 1, rowData.length).setValues([rowData]);
      return;
    }
  }

  // 없으면 추가 (Insert)
  sheet.appendRow(rowData);
}

function deleteRowData(ss, sheetName, id, idIndex) {
  var sheet = ss.getSheetByName(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  // 뒤에서부터 삭제해야 인덱스가 꼬이지 않음
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] == id) {
      sheet.deleteRow(i + 2); // 헤더(1) + 인덱스(0부터) + 1
      return; // ID는 유니크하다고 가정하고 삭제 후 종료
    }
  }
}

function deleteVacationsByEmpId(ss, empId) {
  var sheet = ss.getSheetByName('Vacations');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var values = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // 2번째 컬럼(B)이 employeeId
  
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] == empId) {
      sheet.deleteRow(i + 2);
    }
  }
}
```

## 2. 배포 및 설정 (필수!)

1.  코드를 Apps Script 편집기에 붙여넣고 저장합니다.
2.  **[배포] -> [새 배포]**를 클릭합니다.
3.  유형: **웹 앱**
4.  설명: `Column Fixed Ver` (원하는 대로)
5.  액세스 권한: **모든 사용자 (Anyone)** (이게 중요합니다!)
6.  **[배포]** 클릭 후 생성된 **웹 앱 URL**을 복사합니다.
7.  프로젝트의 `.env` 파일을 열어 `VITE_GAS_APP_URL` 값을 새 URL로 교체합니다.

> **주의:** 시트의 헤더(1행)는 코드가 자동으로 생성하지만, 기존 데이터가 꼬여 있다면 시트의 내용을 모두 지우고(1행만 남기거나 시트 삭제) 다시 시작하는 것이 좋습니다.
