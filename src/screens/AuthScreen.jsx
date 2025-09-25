import React, { useState } from 'react';
import './AuthScreen.css';

const AuthScreen = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 입력 필드 변경 핸들러
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 에러 메시지 초기화
    if (error) setError('');
  };

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 기본 유효성 검사
      if (!formData.email || !formData.password) {
        throw new Error('이메일과 비밀번호를 입력해주세요.');
      }

      if (!isLogin && formData.password !== formData.confirmPassword) {
        throw new Error('비밀번호가 일치하지 않습니다.');
      }

      // 실제 구현에서는 API 호출
      await simulateAuthRequest(formData, isLogin);

      // 성공 시 사용자 데이터 생성
      const userData = {
        id: Date.now(),
        email: formData.email,
        name: formData.email.split('@')[0],
        loginTime: new Date().toISOString()
      };

      onLoginSuccess("main")

    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 요청 시뮬레이션
  const simulateAuthRequest = (data, isLoginMode) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 간단한 유효성 검사 시뮬레이션
        if (data.email.includes('@') && data.password.length >= 6) {
          resolve();
        } else {
          reject(new Error(
            isLoginMode 
              ? '이메일 또는 비밀번호가 올바르지 않습니다.' 
              : '유효한 이메일과 6자 이상의 비밀번호를 입력해주세요.'
          ));
        }
      }, 1000);
    });
  };

  // 로그인/회원가입 모드 전환
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      confirmPassword: ''
    });
    setError('');
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        {/* 브랜딩 헤더 */}
        <div className="auth-header">
          <div className="brand-logo">
            <div className="logo-icon">J</div>
            <h1 className="brand-name">Jaster Studio</h1>
          </div>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in / Login' : 'Create Account'}
          </p>
        </div>

        {/* 인증 폼 */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="이메일을 입력하세요"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="form-input"
              placeholder="비밀번호를 입력하세요"
              disabled={isLoading}
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="form-input"
                placeholder="비밀번호를 다시 입력하세요"
                disabled={isLoading}
                required
              />
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="auth-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                isLogin ? 'Login' : 'Sign up'
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={toggleMode}
              disabled={isLoading}
            >
              {isLogin ? 'Sign up' : 'Back to Login'}
            </button>
          </div>
        </form>

        {/* 추가 정보 */}
        <div className="auth-footer">
          <p className="auth-info">
            {isLogin 
              ? '계정이 없으신가요? Sign up을 클릭하세요.' 
              : '이미 계정이 있으신가요? Login으로 돌아가세요.'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
