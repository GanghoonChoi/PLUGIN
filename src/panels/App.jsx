import React, { useState, useCallback } from "react";

import { Container } from "../components/container.jsx";
import AuthScreen from "../screens/AuthScreen.jsx";
import MainWorkflow from "../screens/MainWorkflow.jsx";

export const App = () => {
  const [currentScreen, setCurrentScreen] = useState("auth");
  const [user, setUser] = useState(null);
  const [workflowData, setWorkflowData] = useState({
    selectedProject: null,
    selectedSequence: null,
    currentStep: 1,
    progress: 0,
    results: []
  });

  const handleLogout = () => {
    setCurrentScreen("auth");
    setUser(null);
    setWorkflowData({
      selectedProject: null,
      selectedSequence: null,
      currentStep: 1,
      progress: 0,
      results: []
    });
  };

  // 워크플로우 완료 핸들러
  const handleWorkflowComplete = (results) => {
    setWorkflowData((prev) => ({
      ...prev,
      results: [...prev.results, ...results]
    }));
    setCurrentScreen("results");
  };

  // ✅ 메모이즈: 레퍼런스가 안정적이어서 자식 useEffect가 매 렌더마다 재실행되지 않음
  const updateWorkflowData = useCallback((updates) => {
    setWorkflowData((prev) => ({
      ...prev,
      ...updates
    }));
  }, []);

  const navigateToScreen = (screen) => {
    setCurrentScreen(screen);
  };

  return (
    <>
      <div>
        <div>
          {currentScreen === "auth" && (
            <AuthScreen
              onLoginSuccess={(loggedInUser) => {
                // 선택: 사용자 정보 저장
                if (loggedInUser) setUser(loggedInUser);
                setCurrentScreen("main");
              }}
            />
          )}
          {currentScreen === "main" && (
            <MainWorkflow
              workflowData={workflowData}
              onWorkflowComplete={handleWorkflowComplete}
              onUpdateWorkflow={updateWorkflowData}
              onLogout={handleLogout}
              onNavigate={navigateToScreen}
            />
          )}
        </div>
      </div>
    </>
  );
};
