/**
 * 트리거 관리 함수들 (날짜 지정 가능)
 * TriggerManagement.gs
 */

/**
 * 날짜 지정 가능한 트리거 생성 함수
 * @param {string} fileId - Coupang 파일 ID
 * @param {string} fileName - 파일명
 * @param {number} hour - 실행 시간 (시)
 * @param {number} minute - 실행 분 (분)
 * @param {string} targetDate - 처리할 날짜 (MMDD 형식, 선택사항)
 */
function createTodayAutoTriggerWithDate(fileId, fileName, hour, minute, targetDate = null) {
  console.log('=== Function Start: createTodayAutoTriggerWithDate ===');
  
  try {
    if (!fileId || !fileName) {
      throw new Error('파일 ID와 파일명이 필요합니다.');
    }
    
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error('올바른 시간을 입력해주세요. (시: 0-23, 분: 0-59)');
    }
    
    // 날짜 유효성 검사 (선택사항)
    if (targetDate) {
      if (targetDate.length !== 4 || !/^\d{4}$/.test(targetDate)) {
        throw new Error('날짜는 MMDD 형식으로 입력해주세요. (예: 1205, 0315)');
      }
      
      const month = parseInt(targetDate.substring(0, 2));
      const day = parseInt(targetDate.substring(2, 4));
      
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        throw new Error('올바른 날짜를 입력해주세요. (월: 01-12, 일: 01-31)');
      }
    }
    
    // 기존 트리거 정리
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'executeTriggerCoupangAutomation' || 
          trigger.getHandlerFunction() === 'retryTriggerAutomation') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log(`기존 트리거 삭제: ${trigger.getHandlerFunction()}`);
      }
    }
    
    // Script Properties에 파일 정보와 날짜 저장
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperties({
      'COUPANG_FILE_ID': fileId,
      'COUPANG_FILE_NAME': fileName,
      'TARGET_DATE': targetDate || '', // 빈 문자열이면 오늘 날짜 사용
      'TRIGGER_RETRY_COUNT': '0'
    });
    
    console.log('저장된 설정:', {
      fileId,
      fileName,
      targetDate: targetDate || '오늘',
      hour,
      minute
    });
    
    // 실행 시간 계산
    const triggerTime = new Date();
    triggerTime.setHours(hour, minute, 0, 0);
    
    // 만약 설정 시간이 현재보다 이전이면 내일로 설정
    if (triggerTime <= new Date()) {
      triggerTime.setDate(triggerTime.getDate() + 1);
    }
    
    // 트리거 생성
    const trigger = ScriptApp.newTrigger('executeTriggerCoupangAutomationWithDate')
      .timeBased()
      .at(triggerTime)
      .create();
    
    const result = {
      success: true,
      triggerId: trigger.getUniqueId(),
      triggerTime: triggerTime.toLocaleString('ko-KR'),
      targetDate: targetDate || '오늘',
      fileName: fileName,
      deletedPreviousTriggers: deletedCount,
      message: `트리거 설정 완료: ${triggerTime.toLocaleString('ko-KR')}`
    };
    
    console.log('트리거 생성 완료:', result);
    console.log('=== Function End: createTodayAutoTriggerWithDate SUCCESS ===');
    return result;
    
  } catch (error) {
    console.error('ERROR in createTodayAutoTriggerWithDate:', error.toString());
    console.log('=== Function End: createTodayAutoTriggerWithDate FAILED ===');
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 날짜 지정 가능한 트리거용 Coupang 자동화 함수
 */
function executeTriggerCoupangAutomationWithDate() {
  console.log('=== Function Start: executeTriggerCoupangAutomationWithDate ===');
  
  try {
    // 설정 초기화
    initializeConfig();
    
    // 저장된 설정 읽기
    const scriptProperties = PropertiesService.getScriptProperties();
    const coupangFileId = scriptProperties.getProperty('COUPANG_FILE_ID');
    const targetDate = scriptProperties.getProperty('TARGET_DATE');
    const fileName = scriptProperties.getProperty('COUPANG_FILE_NAME') || '업로드된 파일';
    
    const dateMessage = targetDate ? `${targetDate.substring(0,2)}월 ${targetDate.substring(2,4)}일` : '오늘';
    const hasCoupangFile = Boolean(coupangFileId);
    
    logUpdate('🚀 날짜 지정 트리거 자동화 시작', { 
      success: true, 
      coupangFileId: coupangFileId || '없음',
      hasCoupangFile,
      targetDate: dateMessage,
      fileName: hasCoupangFile ? fileName : '쿠팡 파일 없음',
      time: new Date().toLocaleString('ko-KR') 
    });
    
    // 1. Part 1: 싸이버스카이 + EDI + 데이터 처리 + 검산 (날짜 지정)
    const part1Result = executeFullPart1PipelineWithDate(targetDate);
    if (!part1Result.success) {
      throw new Error('Part 1 파이프라인 실패: ' + part1Result.error);
    }
    
    let result;
    
    if (hasCoupangFile) {
      // 2-A. 쿠팡 파일이 있는 경우: 파일에서 데이터 읽기
      logUpdate('📄 쿠팡 파일 처리 시작', { fileName, fileId: coupangFileId });
      
      const coupangFile = DriveApp.getFileById(coupangFileId);
      const blob = coupangFile.getBlob();
      const base64Data = Utilities.base64Encode(blob.getBytes());
      
      // 3-A. 완전 자동화 파이프라인 실행 (쿠팡 파일 포함)
      result = processCoupangFileAndExecuteRemaining(base64Data, fileName);
      
    } else {
      // 2-B. 쿠팡 파일이 없는 경우: Part 2만 실행 (쿠팡 없이)
      logUpdate('📌 쿠팡 파일 없이 Part 2 실행', { message: '쿠팡 주문 없음' });
      
      // 3-B. Part 2 실행 (품목분리, 엑셀생성, 이메일전송)
      result = executePart2WithoutCoupang(targetDate);
    }
    
    if (result.success) {
      const successMessage = hasCoupangFile ? 
        `🎉 ${dateMessage} 데이터 트리거 자동화 완료! (쿠팡 포함) 트리거 정리 중...` :
        `🎉 ${dateMessage} 데이터 트리거 자동화 완료! (쿠팡 없음) 트리거 정리 중...`;
      
      logUpdate(successMessage, result);
      
      // 성공시 트리거 자동 삭제
      deleteTriggerAndCleanupWithDate();
      
      console.log('=== Function End: executeTriggerCoupangAutomationWithDate SUCCESS ===');
      return result;
      
    } else {
      logUpdate(`❌ ${dateMessage} 데이터 트리거 자동화 실패 - 30분 후 재시도`, result);
      
      // 실패시 30분 후 재시도 트리거 설정
      scheduleRetryTriggerWithDate();
      
      console.log('=== Function End: executeTriggerCoupangAutomationWithDate FAILED - RETRY SCHEDULED ===');
      return result;
    }
    
  } catch (error) {
    console.error('ERROR in executeTriggerCoupangAutomationWithDate:', error.toString());
    logUpdate('❌ 날짜 지정 트리거 자동화 오류 - 30분 후 재시도', { 
      success: false, 
      error: error.toString() 
    });
    
    // 오류시 30분 후 재시도 트리거 설정
    scheduleRetryTriggerWithDate();
    
    console.log('=== Function End: executeTriggerCoupangAutomationWithDate ERROR - RETRY SCHEDULED ===');
    return { success: false, error: error.toString() };
  }
}

/**
 * 날짜 지정 가능한 완전한 Part 1 파이프라인
 * @param {string} targetDate - 처리할 날짜 (MMDD 형식, null이면 오늘)
 */
function executeFullPart1PipelineWithDate(targetDate = null) {
  console.log('=== Function Start: executeFullPart1PipelineWithDate ===');
  console.log('Target Date:', targetDate || '오늘');
  
  try {
    const dateMessage = targetDate ? `${targetDate.substring(0,2)}월 ${targetDate.substring(2,4)}일` : '오늘';
    
    // 1. 싸이버스카이 데이터 업데이트 (날짜 지정)
    const cyberskyResult = targetDate ? 
      CyberskyData.updateCyberskyDataForDate(targetDate) : 
      CyberskyData.updateCyberskyData();
      
    logUpdate(`1️⃣ 싸이버스카이 데이터 업데이트 (${dateMessage})`, cyberskyResult);
    
    if (!cyberskyResult.success) {
      logUpdate(`⚠️ ${dateMessage} 트리거 파이프라인 중단: 싸이버스카이 데이터 실패`, cyberskyResult);
      return cyberskyResult;
    }
    
    // 2. EDI 데이터 업데이트 (날짜 지정)
    const ediResult = targetDate ? 
      EDIData.updateEDIDataForDate(targetDate) : 
      EDIData.updateEDIData();
      
    logUpdate(`2️⃣ EDI 데이터 업데이트 (${dateMessage})`, ediResult);
    
    // EDI 실패해도 계속 진행 (싸이버스카이 데이터만으로도 처리 가능)
    
    // 3. 데이터 처리 (A+B → C 시트)
    const processResult = DataProcessor.processData();
    logUpdate(`3️⃣ 데이터 처리 (A+B→C) - ${dateMessage}`, processResult);
    
    if (!processResult.success) {
      logUpdate(`⚠️ ${dateMessage} 트리거 파이프라인 중단: 데이터 처리 실패`, processResult);
      return processResult;
    }
    
    // 4. 검산 실행
    const verifyResult = Verification.runVerification();
    logUpdate(`4️⃣ 검산 실행 - ${dateMessage}`, verifyResult);
    
    if (!verifyResult.success) {
      // 검산 실패 시 경고 이메일 전송
      sendVerificationFailureAlert(null, verifyResult.error || '검산 실패');
      logUpdate(`❌ ${dateMessage} 트리거 파이프라인 중단: 검산 실패`, verifyResult);
      return verifyResult;
    }
    
    logUpdate(`✅ Part 1 완료 - ${dateMessage} Coupang 처리 준비됨`, {
      success: true,
      message: `${dateMessage} 싸이버스카이/EDI/데이터처리/검산까지 완료`,
      time: new Date().toLocaleString('ko-KR')
    });
    
    console.log('=== Function End: executeFullPart1PipelineWithDate SUCCESS ===');
    return { success: true, message: `Part 1 파이프라인 완료 (${dateMessage})` };
    
  } catch (error) {
    console.error('ERROR in executeFullPart1PipelineWithDate:', error.toString());
    logUpdate(`❌ Part 1 파이프라인 오류 (${targetDate || '오늘'})`, { 
      success: false, 
      error: error.toString() 
    });
    console.log('=== Function End: executeFullPart1PipelineWithDate FAILED ===');
    return { success: false, error: error.toString() };
  }
}

/**
 * 날짜 지정 트리거 삭제 및 정리
 */
function deleteTriggerAndCleanupWithDate() {
  console.log('=== Function Start: deleteTriggerAndCleanupWithDate ===');
  
  try {
    // 현재 실행 중인 트리거 찾기 및 삭제
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'executeTriggerCoupangAutomationWithDate' || 
          trigger.getHandlerFunction() === 'retryTriggerAutomationWithDate') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
        console.log(`트리거 삭제: ${trigger.getHandlerFunction()}`);
      }
    }
    
    // 설정 정리
    const scriptProperties = PropertiesService.getScriptProperties();
    const coupangFileId = scriptProperties.getProperty('COUPANG_FILE_ID');
    const targetDate = scriptProperties.getProperty('TARGET_DATE');
    
    if (coupangFileId) {
      // Coupang 파일 삭제 (옵션)
      try {
        DriveApp.getFileById(coupangFileId).setTrashed(true);
        console.log('Coupang 파일 휴지통으로 이동:', coupangFileId);
      } catch (fileError) {
        console.log('Coupang 파일 삭제 실패 (이미 삭제됨):', fileError.toString());
      }
    }
    
    // 모든 관련 설정 정리
    const propertiesToDelete = [
      'COUPANG_FILE_ID', 
      'COUPANG_FILE_NAME', 
      'TARGET_DATE', 
      'TRIGGER_RETRY_COUNT'
    ];
    
    propertiesToDelete.forEach(prop => {
      scriptProperties.deleteProperty(prop);
    });
    
    const dateMessage = targetDate ? `${targetDate.substring(0,2)}월 ${targetDate.substring(2,4)}일` : '오늘';
    
    logUpdate(`🧹 ${dateMessage} 트리거 정리 완료`, { 
      success: true, 
      deletedTriggers: deletedCount,
      cleanedProperties: propertiesToDelete
    });
    
    console.log('=== Function End: deleteTriggerAndCleanupWithDate SUCCESS ===');
    return { success: true, deletedTriggers: deletedCount };
    
  } catch (error) {
    console.error('ERROR in deleteTriggerAndCleanupWithDate:', error.toString());
    console.log('=== Function End: deleteTriggerAndCleanupWithDate FAILED ===');
    return { success: false, error: error.toString() };
  }
}

/**
 * 날짜 지정 재시도 트리거 스케줄링 (30분 후)
 */
function scheduleRetryTriggerWithDate() {
  console.log('=== Function Start: scheduleRetryTriggerWithDate ===');
  
  try {
    // 재시도 횟수 확인
    const scriptProperties = PropertiesService.getScriptProperties();
    const retryCount = parseInt(scriptProperties.getProperty('TRIGGER_RETRY_COUNT') || '0');
    const targetDate = scriptProperties.getProperty('TARGET_DATE');
    const dateMessage = targetDate ? `${targetDate.substring(0,2)}월 ${targetDate.substring(2,4)}일` : '오늘';
    
    // 최대 3회까지만 재시도
    if (retryCount >= 3) {
      logUpdate(`❌ ${dateMessage} 최대 재시도 횟수 초과 - 트리거 정리`, { 
        success: false, 
        retryCount,
        message: '3회 재시도 후 포기, 수동 처리 필요' 
      });
      
      deleteTriggerAndCleanupWithDate();
      console.log('=== Function End: scheduleRetryTriggerWithDate - MAX RETRIES REACHED ===');
      return { success: false, error: '최대 재시도 횟수 초과' };
    }
    
    // 기존 재시도 트리거 정리
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
      if (trigger.getHandlerFunction() === 'retryTriggerAutomationWithDate') {
        ScriptApp.deleteTrigger(trigger);
        console.log('기존 재시도 트리거 삭제');
      }
    }
    
    // 30분 후 재시도 트리거 생성
    const retryTime = new Date();
    retryTime.setMinutes(retryTime.getMinutes() + 30);
    
    const retryTrigger = ScriptApp.newTrigger('retryTriggerAutomationWithDate')
      .timeBased()
      .at(retryTime)
      .create();
    
    // 재시도 횟수 증가
    scriptProperties.setProperty('TRIGGER_RETRY_COUNT', (retryCount + 1).toString());
    
    logUpdate(`⏰ ${dateMessage} 재시도 트리거 설정`, { 
      success: true, 
      retryTime: retryTime.toLocaleString('ko-KR'),
      retryCount: retryCount + 1,
      triggerId: retryTrigger.getUniqueId()
    });
    
    console.log('=== Function End: scheduleRetryTriggerWithDate SUCCESS ===');
    return { 
      success: true, 
      retryTime,
      retryCount: retryCount + 1
    };
    
  } catch (error) {
    console.error('ERROR in scheduleRetryTriggerWithDate:', error.toString());
    console.log('=== Function End: scheduleRetryTriggerWithDate FAILED ===');
    return { success: false, error: error.toString() };
  }
}

/**
 * 날짜 지정 재시도 트리거 함수
 */
function retryTriggerAutomationWithDate() {
  console.log('=== Function Start: retryTriggerAutomationWithDate ===');
  
  const scriptProperties = PropertiesService.getScriptProperties();
  const retryCount = parseInt(scriptProperties.getProperty('TRIGGER_RETRY_COUNT') || '0');
  const targetDate = scriptProperties.getProperty('TARGET_DATE');
  const dateMessage = targetDate ? `${targetDate.substring(0,2)}월 ${targetDate.substring(2,4)}일` : '오늘';
  
  logUpdate(`🔄 ${dateMessage} 자동화 재시도 시작 (${retryCount}/3회)`, { 
    success: true, 
    time: new Date().toLocaleString('ko-KR') 
  });
  
  // 원본 함수 재실행
  const result = executeTriggerCoupangAutomationWithDate();
  
  console.log('=== Function End: retryTriggerAutomationWithDate ===');
  return result;
}

/**
 * 기존 트리거와의 호환성을 위한 함수 (기본 동작 = 오늘 날짜)
 */
function createTodayAutoTrigger(fileId, fileName, hour, minute) {
  return createTodayAutoTriggerWithDate(fileId, fileName, hour, minute, null);
}

function executeTriggerCoupangAutomation() {
  return executeTriggerCoupangAutomationWithDate();
}

function executeFullPart1Pipeline() {
  return executeFullPart1PipelineWithDate(null);
}

function deleteTriggerAndCleanup() {
  return deleteTriggerAndCleanupWithDate();
}

function scheduleRetryTrigger() {
  return scheduleRetryTriggerWithDate();
}

function retryTriggerAutomation() {
  return retryTriggerAutomationWithDate();
}