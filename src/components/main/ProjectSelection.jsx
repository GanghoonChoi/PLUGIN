import React, { useState, useEffect } from 'react';
import './ProjectSelection.css';

const ProjectSelection = ({ workflowData, onNext, isProcessing }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(workflowData.selectedProject);
  const [isLoading, setIsLoading] = useState(true);

  // 프로젝트 목록 로드
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    
    try {
      // Premiere Pro API를 통한 프로젝트 정보 가져오기 시뮬레이션
      const mockProjects = [
        {
          id: 'project_1',
          name: 'Marketing Campaign 2024',
          thumbnail: '/api/placeholder/160/90',
          sequences: ['Main_Sequence', 'Intro_Sequence', 'Outro_Sequence'],
          duration: '00:02:30',
          lastModified: '2024-09-20',
          status: 'active'
        },
        {
          id: 'project_2', 
          name: 'Product Demo Video',
          thumbnail: '/api/placeholder/160/90',
          sequences: ['Demo_Main', 'Feature_Highlights'],
          duration: '00:01:45',
          lastModified: '2024-09-19',
          status: 'active'
        },
        {
          id: 'project_3',
          name: 'Corporate Presentation',
          thumbnail: '/api/placeholder/160/90',
          sequences: ['Presentation_Main'],
          duration: '00:05:20',
          lastModified: '2024-09-18',
          status: 'completed'
        }
      ];

      // 실제 구현에서는 Premiere Pro UXP API 사용
      // const activeProject = await app.project.getActiveProject();
      // const sequences = await activeProject.getSequences();
      
      setTimeout(() => {
        setProjects(mockProjects);
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to load projects:', error);
      setIsLoading(false);
    }
  };

  // 프로젝트 선택 핸들러
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };

  // 다음 단계로 진행
  const handleNext = () => {
    if (selectedProject) {
      onNext({
        selectedProject,
        currentStep: 2
      });
    }
  };

  return (
    <div className="project-selection">
      <div className="selection-content">
        {/* 설명 텍스트 */}
        <div className="selection-description">
          <p className="description-text">
            작업할 프로젝트를 선택하세요. 선택한 프로젝트의 시퀀스를 다음 단계에서 설정할 수 있습니다.
          </p>
        </div>

        {/* 프로젝트 목록 */}
        <div className="projects-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>프로젝트를 불러오는 중...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <p>사용 가능한 프로젝트가 없습니다.</p>
              <button className="btn btn-outline" onClick={loadProjects}>
                새로고침
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`project-card ${selectedProject?.id === project.id ? 'selected' : ''}`}
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="project-thumbnail">
                    <div className="thumbnail-placeholder">
                      <div className="play-icon">▶</div>
                    </div>
                    <div className="project-status">
                      <span className={`status-badge ${project.status}`}>
                        {project.status === 'active' ? '활성' : '완료'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="project-info">
                    <h3 className="project-name">{project.name}</h3>
                    <div className="project-details">
                      <span className="project-duration">{project.duration}</span>
                      <span className="project-sequences">
                        {project.sequences.length}개 시퀀스
                      </span>
                    </div>
                    <div className="project-meta">
                      <span className="last-modified">
                        수정: {project.lastModified}
                      </span>
                    </div>
                  </div>
                  
                  {selectedProject?.id === project.id && (
                    <div className="selection-indicator">
                      <div className="check-icon">✓</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 선택된 프로젝트 정보 */}
        {selectedProject && (
          <div className="selected-project-info">
            <div className="info-header">
              <h4>선택된 프로젝트</h4>
            </div>
            <div className="info-content">
              <div className="info-item">
                <span className="info-label">이름:</span>
                <span className="info-value">{selectedProject.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">시퀀스:</span>
                <span className="info-value">
                  {selectedProject.sequences.join(', ')}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">총 길이:</span>
                <span className="info-value">{selectedProject.duration}</span>
              </div>
            </div>
          </div>
        )}

        {/* 진행 화살표 및 다음 버튼 */}
        <div className="selection-actions">
          <div className="progress-arrow">
            <div className="arrow-line"></div>
            <div className="arrow-head">→</div>
          </div>
          
          <button
            className="btn btn-primary btn-next"
            onClick={handleNext}
            disabled={!selectedProject || isProcessing}
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

export default ProjectSelection;
