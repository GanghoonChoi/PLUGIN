import React, { useState, useEffect } from 'react';
//import '../styles/ProgressMonitor.css';

const ProgressMonitor = ({ workflowData, onComplete, onRestart, isProcessing }) => {
  const [progress, setProgress] = useState(0);
  const [currentTask, setCurrentTask] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([]);

  // 처리 단계 정의
  const steps = [
    { id: 1, name: '프로젝트 분석', duration: 1000 },
    { id: 2, name: '시퀀스 처리', duration: 1500 },
    { id: 3, name: '렌더링 준비', duration: 800 },
    { id: 4, name: '미디어 인코딩', duration: 2000 },
    { id: 5, name: '최종 출력', duration: 700 }
  ];

  // 진행 상황 시뮬레이션
  useEffect(() => {
    if (isProcessing && !isCompleted) {
      simulateProgress();
    }
  }, [isProcessing, isCompleted]);

  const simulateProgress = async () => {
    setProgress(0);
    setProcessingSteps([]);
    
    let totalProgress = 0;
    const stepProgress = 100 / steps.length;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      setCurrentTask(step.name);
      
      // 단계 시작
      setProcessingSteps(prev => [
        ...prev,
        { ...step, status: 'processing', startTime: Date.now() }
      ]);
      
      // 진행률 애니메이션
      const startProgress = totalProgress;
      const endProgress = totalProgress + stepProgress;
      const duration = step.duration;
      const interval = 50;
      const increment = (endProgress - startProgress) / (duration / interval);
      
      await new Promise(resolve => {
        let currentProgress = startProgress;
        const progressInterval = setInterval(() => {
          currentProgress += increment;
          if (currentProgress >= endProgress) {
            currentProgress = endProgress;
            clearInterval(progressInterval);
            resolve();
          }
          setProgress(Math.min(currentProgress, 100));
        }, interval);
      });
      
      // 단계 완료
      setProcessingSteps(prev => 
        prev.map(s => 
          s.id === step.id 
            ? { ...s, status: 'completed', endTime: Date.now() }
            : s
        )
      );
      
      totalProgress = endProgress;
    }
    
    // 완료 처리
    setProgress(100);
    setCurrentTask('작업 완료');
    setIsCompleted(true);
    
    // 완료 후 자동으로 결과 화면으로 이동
    setTimeout(() => {
      onComplete({
        progress: 100,
        completed: true,
        results: generateResults()
      });
    }, 1000);
  };

  // 결과 데이터 생성
  const generateResults = () => {
    return {
      outputFile: `${workflowData.selectedSequence?.name}_${workflowData.selectedTemplate?.id}.mp4`,
      fileSize: '245.7 MB',
      duration: workflowData.selectedSequence?.duration || '00:02:30',
      resolution: workflowData.selectedTemplate?.settings.resolution || '1920x1080',
      framerate: workflowData.selectedTemplate?.settings.framerate || '30fps',
      exportTime: new Date().toLocaleString(),
      processingTime: calculateProcessingTime()
    };
  };

  // 처리 시간 계산
  const calculateProcessingTime = () => {
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    const minutes = Math.floor(totalDuration / 60000);
    const seconds = Math.floor((totalDuration % 60000) / 1000);
    return `${minutes}분 ${seconds}초`;
  };

  // 진행률 바 색상 결정
  const getProgressColor = () => {
    if (isCompleted) return '#10b981'; // 완료 - 초록색
    if (progress > 75) return '#f59e0b'; // 거의 완료 - 주황색
    if (progress > 50) return '#3b82f6'; // 진행 중 - 파란색
    return '#6366f1'; // 시작 - 보라색
  };

  return (
    <div className="progress-monitor">
      <div className="monitor-content">
        {/* 진행 상황 헤더 */}
        <div className="progress-header">
          <div className="progress-info">
            <h3 className="progress-title">
              {isCompleted ? '작업이 완료되었습니다!' : '작업을 진행하고 있습니다...'}
            </h3>
            <p className="progress-subtitle">
              {isCompleted 
                ? '결과를 확인하고 파일을 다운로드할 수 있습니다.'
                : '잠시만 기다려주세요. 작업이 진행 중입니다.'
              }
            </p>
          </div>
          
          {isCompleted && (
            <div className="completion-icon">
              <div className="check-circle">✓</div>
            </div>
          )}
        </div>

        {/* 메인 진행률 표시 */}
        <div className="main-progress">
          <div className="progress-circle-container">
            <div className="progress-circle">
              <svg className="progress-ring" width="120" height="120">
                <circle
                  className="progress-ring-background"
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke="#374151"
                  strokeWidth="8"
                />
                <circle
                  className="progress-ring-progress"
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke={getProgressColor()}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div className="progress-text">
                <span className="progress-percentage">{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
          
          <div className="progress-details">
            <div className="current-task">
              <span className="task-label">현재 작업:</span>
              <span className="task-name">{currentTask}</span>
            </div>
            
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-bar-fill"
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: getProgressColor()
                  }}
                />
              </div>
              <span className="progress-label">{Math.round(progress)}% 완료</span>
            </div>
          </div>
        </div>

        {/* 처리 단계 목록 */}
        <div className="processing-steps">
          <h4 className="steps-title">처리 단계</h4>
          <div className="steps-list">
            {steps.map(step => {
              const stepData = processingSteps.find(s => s.id === step.id);
              const status = stepData?.status || 'pending';
              
              return (
                <div key={step.id} className={`step-item ${status}`}>
                  <div className="step-indicator">
                    {status === 'completed' && <span className="step-check">✓</span>}
                    {status === 'processing' && <div className="step-spinner"></div>}
                    {status === 'pending' && <span className="step-number">{step.id}</span>}
                  </div>
                  
                  <div className="step-content">
                    <span className="step-name">{step.name}</span>
                    {stepData && (
                      <span className="step-time">
                        {status === 'completed' 
                          ? `완료 (${Math.round((stepData.endTime - stepData.startTime) / 1000)}초)`
                          : '진행 중...'
                        }
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 작업 정보 */}
        <div className="work-info">
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">프로젝트:</span>
              <span className="info-value">{workflowData.selectedProject?.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">시퀀스:</span>
              <span className="info-value">{workflowData.selectedSequence?.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">템플릿:</span>
              <span className="info-value">{workflowData.selectedTemplate?.name}</span>
            </div>
            <div className="info-item">
              <span className="info-label">출력 형식:</span>
              <span className="info-value">
                {workflowData.selectedTemplate?.settings.resolution} / {workflowData.selectedTemplate?.settings.format}
              </span>
            </div>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="monitor-actions">
          {isCompleted ? (
            <div className="completion-actions">
              <button
                className="btn btn-primary"
                onClick={() => onComplete({ completed: true })}
              >
                결과 확인하기
              </button>
              <button
                className="btn btn-outline"
                onClick={onRestart}
              >
                새 작업 시작
              </button>
            </div>
          ) : (
            <div className="processing-actions">
              <button
                className="btn btn-outline"
                onClick={onRestart}
                disabled={isProcessing}
              >
                작업 취소
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressMonitor;
