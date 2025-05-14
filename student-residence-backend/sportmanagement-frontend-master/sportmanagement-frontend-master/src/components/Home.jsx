import React from "react";
import { FcGoogle } from "react-icons/fc";
import "./css/Login.css"; // Create this CSS file for additional styles
import Footer from "./pageComponents/Footer";
import Header from "./pageComponents/Header";
 

const loginGoogle = () => {
  window.location.href = 'http://localhost:8080/oauth2/authorization/google';
}

const Home = () => {
  return(
    <>
    <Header/>
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Sports Management</h1>
          <h2>Sign In</h2>
          <p>Access your account to manage sports activities</p>
        </div>
        
        <div className="login-body">
          <button className="google-login-btn" onClick={loginGoogle}>
            <FcGoogle className="google-icon"/> 
            <span>Sign in with Google</span>
          </button>
        </div>
        
        <div className="login-footer">
          <p>© {new Date().getFullYear()} Sports Management System</p>
        </div>
      </div>
    </div>
    <Footer/>
    </>
  )
}

export default Home;