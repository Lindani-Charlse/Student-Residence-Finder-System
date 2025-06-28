// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    // ... your config
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

function showMessage(message, divId) {
    const messageDiv = document.getElementById(divId);
    messageDiv.style.display = "block";
    messageDiv.innerHTML = message;
    messageDiv.style.opacity = 1;
    setTimeout(() => {
        messageDiv.style.opacity = 0;
    }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('landlordForm');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');

    // Password confirmation validation
    function validatePassword() {
        if (password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity("Passwords don't match");
            confirmPassword.classList.add('is-invalid');
        } else {
            confirmPassword.setCustomValidity('');
            confirmPassword.classList.remove('is-invalid');
        }
    }

    password.addEventListener('change', validatePassword);
    confirmPassword.addEventListener('keyup', validatePassword);

    // Real-time validation for all inputs
    const inputs = form.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (input.checkValidity()) {
                input.classList.remove('is-invalid');
            } else {
                input.classList.add('is-invalid');
            }
        });
    });

    // Phone number validation
    document.getElementById('phoneNumber').addEventListener('input', function(e) {
        const phonePattern = /^[+]?[\d\s()-]*$/;
        if (!phonePattern.test(e.target.value)) {
            this.setCustomValidity('Invalid phone number format');
            this.classList.add('is-invalid');
        } else {
            this.setCustomValidity('');
            this.classList.remove('is-invalid');
        }
    });

    // Form submission
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // Check HTML5 form validity
        if (!form.checkValidity()) {
            event.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        // Check password match
        if (password.value !== confirmPassword.value) {
            showMessage("Passwords don't match", 'submitLandlordSignUp');
            return;
        }

        // Collect form data
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            password: password.value,
            companyName: document.getElementById('companyName').value,
            phoneNumber: document.getElementById('phoneNumber').value,
            propertyAddress: document.getElementById('propertyAddress').value
        };

        // Firebase user creation
        createUserWithEmailAndPassword(auth, formData.email, formData.password)
            .then((userCredential) => {
                const user = userCredential.user;
                const userData = {
                    email: formData.email,
                    fullName: formData.fullName,
                    companyName: formData.companyName,
                    phoneNumber: formData.phoneNumber,
                    propertyAddress: formData.propertyAddress
                };

                const docRef = doc(db, "users", user.uid);
                return setDoc(docRef, userData);
            })
            .then(() => {
                showMessage('Landlord Account Created Successfully', 'submitLandlordSignUp');
                setTimeout(() => {
                    window.location.href = 'landlord_login.html';
                }, 2000);
            })
            .catch((error) => {
                const errorCode = error.code;
                if (errorCode === 'auth/email-already-in-use') {
                    showMessage('Provided email already used', 'submitLandlordSignUp');
                } else {
                    showMessage(`Error: ${error.message}`, 'submitLandlordSignUp');
                }
            });
    });
});