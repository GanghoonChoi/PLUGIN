import React, { useState, useEffect } from 'react';
import './SequenceSetup.css';

const SequenceSetup = ({ workflowData, onNext, onBack, isProcessing }) => {
  const [sequences, setSequences] = useState([]);
  const [selectedSequence, setSelectedSequence] = useState(workflowData.selectedSequence);
  const [selectedTemplate, setSelectedTemplate] = useState('DIGITAL_AD');
  const [isLoading, setIsLoading] = useState(true);

  // 템플릿 옵션 정의
  const templates = [
    {
      id: 'DIGITAL_AD',
      name: 'DIGITAL AD',
      description: '디지털 광고용 최적화',
      settings: {
        resolution: '1920x1080',
        framerate: '30fps',
        format: 'MP4'
      }
    },
    {
      id: 'SOCIAL_MEDIA',
      name: 'SOCIAL MEDIA',
      description: '소셜 미디어 플랫폼용',
      settings: {
        resolution: '1080x1080',
        framerate: '30fps',
        format: 'MP4'
      }
    },
    {
      id: 'YOUTUBE',
      name: 'YOUTUBE',
      description: 'YouTube 업로드 최적화',
      settings: {
        resolution: '1920x1080',
        framerate: '60fps',
        format: 'MP4'
      }
    },
    {
      id: 'PRESENTATION',
      name: 'PRESENTATION',
      description: '프레젠테이션용 고품질',
      settings: {
        resolution: '1920x1080',
        framerate: '24fps',
        format: 'MOV'
      }
    }
  ];

  // 시퀀스 목록 로드
  useEffect(() => {
    loadSequences();
  }, [workflowData.selectedProject]);

  const loadSequences = async () => {
    setIsLoading(true);
    
    try {
      if (workflowData.selectedProject) {
        // 선택된 프로젝트의 시퀀스 정보 생성
        const projectSequences = workflowData.selectedProject.sequences.map((seqName, index) => ({
          id: `seq_${index}`,
          name: seqName,
          duration: `00:0${index + 1}:${(index * 15) % 60}`,
          tracks: {
            video: Math.floor(Math.random() * 3) + 1,
            audio: Math.floor(Math.random() * 4) + 2
          },
          clips: Math.floor(Math.random() * 20) + 5,
          thumbnail: `/api/placeholder/120/68`
        }));

        setTimeout(() => {
          setSequences(projectSequences);
          setIsLoading(false);
        }, 800);
      }
    } catch (error) {
      console.error('Failed to load sequences:', error);
      setIsLoading(false);
    }
  };

  // 시퀀스 선택 핸들러
  const handleSequenceSelect = (sequence) => {
    setSelectedSequence(sequence);
  };

  // 템플릿 선택 핸들러
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
  };

  // 다음 단계로 진행
  const handleNext = () => {
    if (selectedSequence && selectedTemplate) {
      const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
      onNext({
        selectedSequence,
        selectedTemplate: selectedTemplateData,
        currentStep: 3
      });
    }
  };

  return (
    <div className="sequence-setup">
      <div className="setup-content">
        {/* 시퀀스 선택 섹션 */}
        <div className="setup-section">
          <div className="section-header">
            <h3 className="section-title">시퀀스 선택</h3>
            <p className="section-description">
              작업할 시퀀스를 선택하세요
            </p>
          </div>

          <div className="sequences-container">
            {isLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>시퀀스를 불러오는 중...</p>
              </div>
            ) : (
              <div className="sequences-list">
                {sequences.map(sequence => (
                  <div
                    key={sequence.id}
                    className={`sequence-item ${selectedSequence?.id === sequence.id ? 'selected' : ''}`}
                    onClick={() => handleSequenceSelect(sequence)}
                  >
                    <div className="sequence-thumbnail">
                      <div className="thumbnail-placeholder">
                        <div className="timeline-icon">⏱</div>
                      </div>
                    </div>
                    
                    <div className="sequence-info">
                      <h4 className="sequence-name">{sequence.name}</h4>
                      <div className="sequence-stats">
                        <span className="stat-item">
                          <span className="stat-icon">🎬</span>
                          {sequence.clips} 클립
                        </span>
                        <span className="stat-item">
                          <span className="stat-icon">⏰</span>
                          {sequence.duration}
                        </span>
                      </div>
                      <div className="sequence-tracks">
                        <span className="track-info">
                          비디오: {sequence.tracks.video}트랙
                        </span>
                        <span className="track-info">
                          오디오: {sequence.tracks.audio}트랙
                        </span>
                      </div>
                    </div>
                    
                    {selectedSequence?.id === sequence.id && (
                      <div className="selection-check">✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 템플릿 선택 섹션 */}
        <div className="setup-section">
          <div className="section-header">
            <h3 className="section-title">출력 템플릿</h3>
            <p className="section-description">
              용도에 맞는 출력 설정을 선택하세요
            </p>
          </div>

          <div className="templates-container">
            <div className="templates-grid">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="template-header">
                    <h4 className="template-name">{template.name}</h4>
                    {selectedTemplate === template.id && (
                      <div className="template-check">✓</div>
                    )}
                  </div>
                  
                  <p className="template-description">
                    {template.description}
                  </p>
                  
                  <div className="template-settings">
                    <div className="setting-item">
                      <span className="setting-label">해상도:</span>
                      <span className="setting-value">{template.settings.resolution}</span>
                    </div>
                    <div className="setting-item">
                      <span className="setting-label">프레임레이트:</span>
                      <span className="setting-value">{template.settings.framerate}</span>
                    </div>
                    <div className="setting-item">
                      <span className="setting-label">포맷:</span>
                      <span className="setting-value">{template.settings.format}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 선택 요약 */}
        {selectedSequence && selectedTemplate && (
          <div className="selection-summary">
            <div className="summary-header">
              <h4>작업 설정 요약</h4>
            </div>
            <div className="summary-content">
              <div className="summary-item">
                <span className="summary-label">프로젝트:</span>
                <span className="summary-value">{workflowData.selectedProject?.name}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">시퀀스:</span>
                <span className="summary-value">{selectedSequence.name}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">템플릿:</span>
                <span className="summary-value">
                  {templates.find(t => t.id === selectedTemplate)?.name}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="setup-actions">
          <button
            className="btn btn-outline"
            onClick={onBack}
            disabled={isProcessing}
          >
            이전
          </button>
          
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!selectedSequence || !selectedTemplate || isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="loading-spinner small"></span>
                처리 중...
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SequenceSetup;
