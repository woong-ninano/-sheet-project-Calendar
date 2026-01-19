# 🛠️ Google Apps Script (백엔드) 최종 설정 가이드

500 오류와 CORS 오류를 해결하기 위한 **최종 수정 버전**입니다.
이 코드는 스프레드시트 ID를 입력할 필요가 없으며, 데이터를 유연하게 저장합니다.

## 1. 구글 시트 준비
구글 시트 하단에 아래 두 개의 시트(탭)가 존재하는지 확인하세요.
(기존에 데이터가 있다면 모두 지우고 빈 시트로 만드는 것을 추천합니다.)

*   `Employees`
*   `Vacations`

## 2. Apps Script 코드 (전체 복사 & 붙여넣기)
`Code.gs` 파일의 모든 내용을 지우고 아래 코드를 붙여넣으세요.

```javascript
/**
 * ------------------------------------------------------------------
 * Project Vacation Calendar Backend (NoSQL Style)
 * ------------------------------------------------------------------
 * 이 스크립트는 시트의 A열에 JSON 데이터를 통째로 저장하여
 * 컬럼 순서나 헤더 관리가 필요 없습니다.
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // 동시 접속 충돌 방지
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 최대 30초 대기
  } catch (e) {
    return responseJSON({ error: 'Server is busy, please try again.' });
  }

  try {
    // 1. 파라미터 파싱
    var params = e.parameter || {};
    var postData = null;
    
    // POST 요청의 Body 데이터 파싱
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
        // postData의 내용을 params와 합침
        for (var key in postData) {
          params[key] = postData[key];
        }
      } catch (jsonErr) {
        // JSON 파싱 에러 무시 (GET 요청일 수 있음)
      }
    }

    var action = params.action;
    var result = { status: 'success' };

    // 2. 액션 처리
    if (!action) {
      result = { status: 'active', message: 'Backend is running correctly.' };
    } 
    else if (action === 'getEmployees') {
      result = getJsonData('Employees');
    } 
    else if (action === 'saveEmployee') {
      saveJsonData('Employees', params.payload);
    } 
    else if (action === 'deleteEmployee') {
      deleteJsonData('Employees', params.id);
      // 직원이 삭제되면 관련 휴가도 삭제
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

    return responseJSON(result);

  } catch (error) {
    return responseJSON({ error: error.toString(), stack: error.stack });
  } finally {
    lock.releaseLock();
  }
}

// --- Helper Functions ---

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  // ID 하드코딩 없이 현재 연결된 시트를 자동으로 가져옴
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getJsonData(sheetName) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];

  // A열만 읽어옴 (JSON 데이터 저장소)
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  var data = [];
  
  for (var i = 0; i < values.length; i++) {
    var jsonString = values[i][0];
    if (jsonString && typeof jsonString === 'string' && jsonString.trim() !== '') {
      try {
        data.push(JSON.parse(jsonString));
      } catch (e) {
        // 파싱 실패한 행은 무시
      }
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
  
  // 데이터가 있으면 업데이트 (ID 검색)
  if (lastRow > 0) {
    var values = sheet.getRange(1, 1, lastRow, 1).getValues();
    for (var i = 0; i < values.length; i++) {
      try {
        var rowData = JSON.parse(values[i][0]);
        if (rowData.id === id) {
          // 해당 행 업데이트
          sheet.getRange(i + 1, 1).setValue(JSON.stringify(payload));
          return;
        }
      } catch (e) { continue; }
    }
  }
  
  // 없으면 새로 추가
  sheet.appendRow([JSON.stringify(payload)]);
}

function deleteJsonData(sheetName, id) {
  var sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return;
  
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  // 뒤에서부터 삭제 (인덱스 밀림 방지)
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
  // 모든 휴가 기록 검색하여 해당 직원 것 삭제
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

## 3. 배포 (Deployment) - 이 과정이 가장 중요합니다!

코드를 변경했다면 반드시 **새 버전으로 배포**해야 적용됩니다.

1.  우측 상단 **[배포(Deploy)]** -> **[배포 관리(Manage deployments)]** 클릭.
2.  상단의 연필 아이콘(수정) 클릭 -> **버전(Version)**에서 **'새 버전(New version)'** 선택.
3.  **[배포(Deploy)]** 버튼 클릭.
4.  URL이 바뀌지 않았다면 그대로 두시고, 만약 **새 배포(New deployment)**를 눌러서 URL이 바뀌었다면 `.env` 파일의 URL을 수정해주세요.

> **Tip:** 배포 관리(Manage)에서 '새 버전'을 선택해 업데이트하면 URL이 바뀌지 않아 프론트엔드 코드를 수정할 필요가 없습니다.

## 4. 확인
이제 웹사이트를 새로고침하면 500 오류 없이 데이터가 정상적으로 저장되고 불러와질 것입니다.
