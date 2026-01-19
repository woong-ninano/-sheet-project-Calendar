# 🛠️ Google Apps Script (백엔드) 최종 최적화 버전

500 오류와 타임아웃을 방지하기 위해 **읽기(GET) 요청 시 잠금을 제거**한 버전입니다.
이 코드를 적용하면 캘린더 로딩 속도가 빨라지고 오류가 줄어듭니다.

## 1. Apps Script 코드 업데이트
`Code.gs` 파일의 모든 내용을 지우고 아래 코드를 붙여넣으세요.

```javascript
/**
 * ------------------------------------------------------------------
 * Project Vacation Calendar Backend (Optimized)
 * ------------------------------------------------------------------
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // 1. 파라미터 파싱
    var params = e.parameter || {};
    var postData = null;
    
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

    // 2. 쓰기 작업만 Lock을 걸어 500 오류 최소화 (읽기는 병렬 처리)
    var isWriteOperation = ['saveEmployee', 'deleteEmployee', 'addVacation', 'removeVacation'].includes(action);
    var lock = LockService.getScriptLock();

    if (isWriteOperation) {
      try {
        lock.waitLock(30000); // 30초 대기
      } catch (e) {
        return responseJSON({ error: 'Server is busy. Please try again.' });
      }
    }

    try {
      if (!action) {
        result = { status: 'active', message: 'Backend is running.' };
      } 
      else if (action === 'getEmployees') {
        result = getJsonData('Employees');
      } 
      else if (action === 'saveEmployee') {
        saveJsonData('Employees', params.payload);
      } 
      else if (action === 'deleteEmployee') {
        deleteJsonData('Employees', params.id);
        deleteVacationsByEmpId(params.id);
      } 
      else if (action === 'getVacations') {
        result = getJsonData('Vacations');
      } 
      else if (action === 'addVacation') {
        saveJsonData('Vacations', params.payload);
      } 
      else if (action === 'removeVacation') {
        deleteJsonData('Vacations', params.id);
      } 
      else {
        throw new Error('Unknown action: ' + action);
      }
    } finally {
      if (isWriteOperation) {
        lock.releaseLock();
      }
    }

    return responseJSON(result);

  } catch (error) {
    return responseJSON({ error: error.toString(), stack: error.stack });
  }
}

// --- Helper Functions ---

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getJsonData(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  var data = [];
  
  for (var i = 0; i < values.length; i++) {
    var jsonString = values[i][0];
    if (jsonString && typeof jsonString === 'string' && jsonString.trim() !== '') {
      try {
        data.push(JSON.parse(jsonString));
      } catch (e) {}
    }
  }
  return data;
}

function saveJsonData(sheetName, payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  
  var id = payload.id;
  var lastRow = sheet.getLastRow();
  
  if (lastRow > 0) {
    var values = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      try {
        var rowData = JSON.parse(values[i][0]);
        if (rowData.id === id) {
          sheet.getRange(i + 1, 1).setValue(JSON.stringify(payload));
          return;
        }
      } catch (e) { continue; }
    }
  }
  sheet.appendRow([JSON.stringify(payload)]);
}

function deleteJsonData(sheetName, id) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return;
  
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    try {
      var rowData = JSON.parse(values[i][0]);
      if (rowData.id === id) {
        sheet.deleteRow(i + 1);
        return; 
      }
    } catch (e) { continue; }
  }
}

function deleteVacationsByEmpId(empId) {
  var sheet = getSpreadsheet().getSheetByName('Vacations');
  if (!sheet) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return;

  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    try {
      var rowData = JSON.parse(values[i][0]);
      if (rowData.employeeId === empId) {
        sheet.deleteRow(i + 1);
      }
    } catch (e) { continue; }
  }
}
```

## 2. 배포 (Deployment) - 중요!

코드를 수정한 뒤 반드시 **새 버전**으로 배포해야 합니다.

1.  우측 상단 **[배포(Deploy)]** -> **[배포 관리(Manage deployments)]** 클릭.
2.  상단의 연필 아이콘(수정) 클릭 -> **버전(Version)**에서 **'새 버전(New version)'** 선택.
3.  **[배포(Deploy)]** 버튼 클릭.
4.  URL이 바뀌지 않았다면 완료입니다. (만약 바뀌었다면 `.env`를 업데이트하세요).
