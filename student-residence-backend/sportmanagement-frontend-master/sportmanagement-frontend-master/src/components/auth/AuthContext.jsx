import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // 🔐 Configure Axios headers when token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // 🚀 Fetch current user from backend using token
    const fetchCurrentUser = useCallback(async () => {
        if (!token) return setLoading(false);

        try {
            const { data } = await axios.get('/api/auth/current-user');
            setUser(data);
        } catch (err) {
            console.error('Failed to verify token:', err.response?.data || err.message);
            logout();
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchCurrentUser();
    }, [fetchCurrentUser]);

    // 🔑 Login function
    const login = async (email, password) => {
        try {
            const { data } = await axios.post('/api/auth/login', { email, password });
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser({
                id: data.userId,
                email: data.email,
                role: data.role,
            });
            return true;
        } catch (err) {
            console.error('Login failed:', err.response?.data || err.message);
            return false;
        }
    };

    // 🚪 Logout function
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        navigate('/login');
    };

    // 🔁 Used after OAuth login (ex: Google)
    const handleOAuthSuccess = (token, userId, email, role) => {
        localStorage.setItem('token', token);
        setToken(token);
        setUser({ id: userId, email, role });
    };

    // 🧠 Derived state
    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            isAuthenticated,
            login,
            logout,
            handleOAuthSuccess,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// 🧪 Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);
