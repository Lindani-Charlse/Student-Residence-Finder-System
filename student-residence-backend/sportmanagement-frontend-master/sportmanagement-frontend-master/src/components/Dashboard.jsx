import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from "./pageComponents/Header";
import Footer from "./pageComponents/Footer";
import './pageComponents/showcase.css';

function Dashboard() {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        console.log(userData);
        if (userData) {
            setUser(userData);
        }
    }, []);

    const handleRedirect = (path) => {
        navigate(path);
    };

    return (
        <>
        <Header />
        <div className="dashboard-page">
     
            <div className="dashboard-container">
                {user ? (
                    <div className="user-info">
                        <h2>Welcome, {user.name}</h2>
                        <div className="user-details">
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Role:</strong> {user.role}</p>
                        </div>
                    </div>
                ) : (
                    <p>Loading user data...</p>
                )}

                <div className="dashboard-actions">
                    <h3>Your Actions</h3>
                    <div className="action-cards">
                        <div className="action-card card-blue" onClick={() => handleRedirect('/profile')}>
                            <h4>Manage Profile</h4>
                            <p>Edit your profile information.</p>
                        </div>
                        <div className="action-card card-green" onClick={() => handleRedirect('/bookings')}>
                            <h4>My Bookings</h4>
                            <p>View and manage your facility bookings.</p>
                        </div>
                        <div className="action-card card-red" onClick={() => handleRedirect('/logout')}>
                            <h4>Logout</h4>
                            <p>Logout of your account.</p>
                        </div>

                        {/* Affiche une carte spéciale pour les admins */}
                        {user?.role === 'admin' && (
                            <div className="action-card card-orange" onClick={() => handleRedirect('/management')}>
                                <h4>User Management</h4>
                                <p>Manage platform users and their roles.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
             
        </div>
        </>
    );
}

export default Dashboard;
