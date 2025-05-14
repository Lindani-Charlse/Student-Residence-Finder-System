// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {getFirestore, setDoc, doc} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQdwsyjpvfV98hyx-TGye8hO1D9t5ko6Q",
  authDomain: "student-residence-finder-7c3cc.firebaseapp.com",
  projectId: "student-residence-finder-7c3cc",
  storageBucket: "student-residence-finder-7c3cc.firebasestorage.app",
  messagingSenderId: "416544071071",
  appId: "1:416544071071:web:87ef659f560161a48f31aa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

function showMessage(message, divId){
    var messageDiv = document.getElementById(divId);
    messageDiv.style.display="block";
    messageDiv.innerHTML = message;
    messageDiv.style.opacity=1;
    setTimeout(function(){
        messageDiv.style.opacity=0;
    }, 5000);
}

const landlordSignUp = document.getElementById('submitLandlordSignUp');
landlordSignUp.addEventListener('click', (event)=> {
    event.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const companyName = document.getElementById('companyName').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    const propertyAddress = document.getElementById('propertyAddress').value;

    const auth = getAuth();
    const db = getFirestore();

    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential)=> {
        const user = userCredential.user;
        const userData ={
            email: email,
            fullName: fullName,
            companyName: companyName,
            phoneNumber: phoneNumber,
            propertyAddress: propertyAddress
        };
        showMessage('Landlord Account Created Successfully', 'submitLandlordSignUp');
        const docRef= doc(db, "users", user.uid);
        setDoc(docRef, userData)
        .then(()=> {
            window.location.href='landlord_login.html';
        })
        .catch((error)=>{
            showMessage('error writing document', 'submitLandlordSignUp');
        });
        })
        .catch((error)=>{
        const errorCode = error.code;
        if(errorCode == 'auth/email-already-in-use'){
            showMessage('Provided email already used', 'submitLandlordSignUp');
        } else {
            showMessage('Unable to create account', 'submitLandlordSignUp');
        }
    })
});

document.addEventListener('DOMContentLoaded', function() {
            // Password confirmation validation
            const password = document.getElementById('password');
            const confirmPassword = document.getElementById('confirmPassword');

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

            // Form validation and submission
            const form = document.getElementById('landlordForm');
            
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                
                if (!form.checkValidity()) {
                    event.stopPropagation();
                    form.classList.add('was-validated');
                    return;
                }
                
                // Collect form data
                const formData = {
                    fullName: document.getElementById('fullName').value,
                    email: document.getElementById('email').value,
                    companyName: document.getElementById('companyName').value,
                    phoneNumber: document.getElementById('phoneNumber').value,
                    propertyAddress: document.getElementById('propertyAddress').value
                };

                // Here you would typically send the data to your server
                console.log('Form submission data:', formData);
                
                // Redirect to success page
                window.location.href = `success_landlord.html?type=landlord`;
            }, false);

            // Real-time validation for all fields
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
        });

        