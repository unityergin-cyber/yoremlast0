import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();
  
  // Context'e erişim
  const { login, isAuthenticated, isLoading } = useContext(AuthContext);
  
  // Zaten giriş yapılmışsa dashboard'a yönlendir
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/admin/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLoggingIn) {
      return;
    }
    
    setError("");
    setIsLoggingIn(true);
  
    try {
      const response = await api.post("/api/staff/login", { email, password });
      
      if (!response.data.token) {
        throw new Error("Token not received!");
      }
      
      const { token, staff } = response.data;
      
      // Update context
      login(token, staff);
      
      // Redirect after successful login
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 100);
    } catch (err) {
      setError(err.response?.data?.error || "Giriş başarısız. E-posta veya şifre hatalı.");
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  // Wait while context is loading
  if (isLoading) {
    return <div>Yükleniyor...</div>;
  }
  
  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Admin Girişi</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-posta:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Şifre:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={isLoggingIn}>
            {isLoggingIn ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;