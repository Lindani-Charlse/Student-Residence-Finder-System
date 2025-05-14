import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");
    const role = searchParams.get("role");

    if (token) {
      // Save individual values
      localStorage.setItem("token", token);
      localStorage.setItem("userId", userId);
      localStorage.setItem("email", email);
      localStorage.setItem("role", role);

      // ✅ BONUS: Save the entire user as an object
      const userData = {
        token,
        userId,
        email,
        role,
        welcomeMessage: `Welcome back, ${email.split('@')[0]}!`, // Bonus message
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem("userData", JSON.stringify(userData));
          console.log(userData);
      // Redirect after storing
  navigate("/dashboard");
    } else {
          
    navigate("/login");
    }
  }, [searchParams, navigate]);

  return <div>Logging you in...</div>;
};

export default LoginSuccess;
