import React, { useState, useEffect, useRef } from 'react';
import ProjectSelection from '../components/main/ProjectSelection';
import SequenceSetup from '../components/main/SequenceSetup';
import ProgressMonitor from '../components/main/ProgressMonitor';
import './MainWorkflow.css';

const MainWorkflow = ({ 
  workflowData, 
  onWorkflowComplete, 
  onUpdateWorkflow, 
  onLogout, 
  onNavigate 
}) => {
  const [currentStep, setCurrentStep] = useState(workflowData.currentStep || 1);
  const [isProcessing, setIsProcessing] = useState(false);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  };

  // 단계별 제목 정의
  const stepTitles = {
    1: 'Step 1. 영상 및 작업 선택',
    2: '작업 설정 시퀀스 선택하기',
    3: '작업 진행 상황'
  };

  // ✅ currentStep이 바뀔 때만 부모 상태 동기화 (onUpdateWorkflow 의존성 제거)
  useEffect(() => {
    onUpdateWorkflow({ currentStep });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // 언마운트 시 타이머 정리 (메모리릭 방지)
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const handleNext = async (stepData) => {
    setIsProcessing(true);
    try {
      onUpdateWorkflow(stepData || {});
      
      if (currentStep < 3) {
        const id = setTimeout(() => {
          setCurrentStep(prev => prev + 1);
          setIsProcessing(false);
        }, 500);
        timersRef.current.push(id);
      } else {
        const id = setTimeout(() => {
          const seqName =
            stepData && stepData.selectedSequence && stepData.selectedSequence.name
              ? stepData.selectedSequence.name
              : 'Sequence';

          onWorkflowComplete([{
            id: Date.now(),
            type: 'video_export',
            name: seqName + '_Export',
            status: 'completed',
            createdAt: new Date().toISOString(),
            data: stepData
          }]);
          setIsProcessing(false);
        }, 2000);
        timersRef.current.push(id);
      }
    } catch (error) {
      console.error('Workflow step error:', error);
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    clearTimers();
    setCurrentStep(1);
    onUpdateWorkflow({
      selectedProject: null,
      selectedSequence: null,
      currentStep: 1,
      progress: 0
    });
  };

  return (
    <div className="main-workflow">
      {/* 헤더 */}
      <div className="workflow-header">
        <div className="header-content">
          <div className="brand-section">
            <div className="brand-logo">
              <div className="logo-icon">J</div>
              <span className="brand-name">Jaster Studio</span>
            </div>
            <div className="user-info">
              <button className="logout-btn" onClick={onLogout}>
                로그아웃
              </button>
            </div>
          </div>
          
          <div className="step-info">
            <h2 className="step-title">{stepTitles[currentStep]}</h2>
            <div className="step-indicator">
              {[1, 2, 3].map(step => (
                <div 
                  key={step}
                  className={`step-dot ${step <= currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}
                >
                  {step < currentStep ? '✓' : step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="workflow-content">
        {currentStep === 1 && (
          <ProjectSelection
            workflowData={workflowData}
            onNext={handleNext}
            isProcessing={isProcessing}
          />
        )}
        
        {currentStep === 2 && (
          <SequenceSetup
            workflowData={workflowData}
            onNext={handleNext}
            onBack={handleBack}
            isProcessing={isProcessing}
          />
        )}
        
        {currentStep === 3 && (
          <ProgressMonitor
            workflowData={workflowData}
            onComplete={handleNext}
            onRestart={handleRestart}
            isProcessing={isProcessing}
          />
        )}
      </div>

      {/* 네비게이션 푸터 */}
      <div className="workflow-footer">
        <div className="footer-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('results')}
            disabled={isProcessing}
          >
            결과 보기
          </button>
          
          {currentStep > 1 && currentStep < 3 && (
            <button 
              className="btn btn-outline"
              onClick={handleBack}
              disabled={isProcessing}
            >
              이전
            </button>
          )}
          
          <div className="progress-info">
            <span className="step-counter">{currentStep} / 3</span>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainWorkflow;
