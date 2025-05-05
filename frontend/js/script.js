import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, collection, getDoc, updateDoc, onSnapshot } from "firebase/firestore"; // Import onSnapshot
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";

const storage = getStorage();

document.addEventListener('DOMContentLoaded', () => {
    // Show/Hide Password functionality
    const passwordGroups = document.querySelectorAll('.password-group');
    passwordGroups.forEach(group => {
        const toggleButton = group.querySelector('.toggle-password');
        const passwordInput = group.querySelector('input[type="password"], input[type="text"]');

        if (toggleButton && passwordInput) {
            toggleButton.addEventListener('click', function () {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.textContent = type === 'password' ? 'Show' : 'Hide';
                this.setAttribute('aria-label', type === 'password' ? 'Show password' : 'Hide password');
            });
        }
    });

    // Patient Signup
    const patientSignupForm = document.getElementById('patientSignupForm');
    if (patientSignupForm) {
        patientSignupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = patientSignupForm.email.value;
            const password = patientSignupForm.password.value;
            const confirmPassword = patientSignupForm.confirmPassword.value;
            const fullName = patientSignupForm.fullName.value;
            const dob = patientSignupForm.dob.value;
            const gender = patientSignupForm.gender.value;
            const mobile = patientSignupForm.mobile.value;
            const address = patientSignupForm.address.value;
            const medicalHistory = patientSignupForm.medicalHistory.value;

            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log("User created in Authentication:", user); // Debug
                console.log("User UID:", user.uid); // Debug - Check the UID

                await setDoc(doc(db, "patients", user.uid), {
                    uid: user.uid, // Include the user ID
                    email: email,
                    fullName: fullName,
                    dob: dob,
                    gender: gender,
                    mobile: mobile,
                    address: address,
                    medicalHistory: medicalHistory,
                    role: 'patient'  // Store the user role!
                });
                console.log("Patient data saved to Firestore"); // Debug
                alert("Patient signup successful! You can now log in.");
                window.location.href = '/login';
                localStorage.setItem('patientName', fullName);

            } catch (error) {
                console.error("Error signing up patient:", error);
                alert(`Signup failed: ${error.message}`);
            }
        });
    }



    // Doctor Signup
    const doctorSignupForm = document.getElementById('doctorSignupForm');
    if (doctorSignupForm) {
        doctorSignupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = doctorSignupForm.email.value;
            const password = doctorSignupForm.password.value;
            const confirmPassword = doctorSignupForm.confirmPassword.value;
            const fullName = doctorSignupForm.fullName.value;
            const licenseNumber = doctorSignupForm.licenseNumber.value;
            const specialization = doctorSignupForm.specialization.value;
            const affiliation = doctorSignupForm.affiliation.value;
            const documents = doctorSignupForm.documents.files;

            if (password !== confirmPassword) {
                alert("Passwords do not match!");
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Handle file uploads to Firebase Storage
                const uploadedDocumentUrls = [];
                if (documents && documents.length > 0) {
                    for (let i = 0; i < documents.length; i++) {
                        const file = documents[i];
                        const storageRef = ref(storage, `doctors/${user.uid}/documents/${file.name}`);
                        try {
                            const snapshot = await uploadBytes(storageRef, file);
                            const downloadURL = await getDownloadURL(snapshot.ref);
                            uploadedDocumentUrls.push(downloadURL);
                        } catch (uploadError) {
                            console.error("Error uploading document:", uploadError);
                            alert(`Failed to upload ${file.name}. Please try again.`);
                            return;
                        }
                    }
                }

                await setDoc(doc(db, "doctors", user.uid), {
                    uid: user.uid,
                    email: email,
                    fullName: fullName,
                    licenseNumber: licenseNumber,
                    specialization: specialization,
                    affiliation: affiliation,
                    documents: uploadedDocumentUrls,
                    role: 'doctor',  // Store the user role!
                    verificationStatus: 'pending'
                });

                alert("Doctor registration successful! Your account is pending verification.  Please allow 24 hours for verification.");
                localStorage.setItem('doctorName', fullName);
                window.location.href = '/login';
            } catch (error) {
                console.error("Error signing up doctor:", error);
                alert(`Registration failed: ${error.message}`);
            }
        });
    }

    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = loginForm.email.value;
            const password = loginForm.password.value;
            const userType = loginForm.userType.value;  // Get the user type from the form
            console.log("Login form submitted. User type:", userType, "Email:", email); // Debugging
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log("User logged in successfully:", user);

                if (userType === 'patient') {
                    const patientRef = doc(db, "patients", user.uid);
                    getDoc(patientRef).then((patientSnap) => {
                        if (patientSnap.exists()) {
                            const patientData = patientSnap.data();
                            console.log("Patient data:", patientData);
                            localStorage.setItem('patientName', patientData.fullName);
                            window.location.href = '/dashboard_patient.html'; // Corrected path
                        }
                         else{
                             console.error("Patient data does not exist in database")
                             alert("Patient data does not exist. Contact Support")
                             await signOut(auth)
                             window.location.href = '/login'
                         }
                    }).catch(err =>{  //added error
                        console.error("Error fetching patient data", err);
                        alert("Error fetching patient data.  Redirecting to login.");
                        window.location.href = '/login';
                    });
                } else if (userType === 'doctor') {
                    const doctorRef = doc(db, "doctors", user.uid);
                    getDoc(doctorRef).then((doctorSnap) => {
                        if (doctorSnap.exists()) {
                            const doctorData = doctorSnap.data();
                            console.log("Doctor data:", doctorData);
                            localStorage.setItem('doctorName', doctorData.fullName);
                            if (doctorData.verificationStatus === 'verified') {
                                window.location.href = '/dashboard_doctor.html'; // Corrected path
                            } else if (doctorData.verificationStatus === 'pending') {
                                alert("Your account is pending verification. Please check back later.");
                                await signOut(auth);
                                window.location.href = '/login';
                            } else {
                                alert("Your account has been rejected. Please contact support.");
                                await signOut(auth);
                                window.location.href = '/login';
                            }
                        }
                        else{
                            console.error("Doctor data does not exist in database")
                            alert("Doctor data does not exist. Contact Support")
                            await signOut(auth)
                            window.location.href = '/login'
                        }
                    }).catch(err =>{  //added error
                        console.error("Error fetching doctor data", err);
                        alert("Error fetching doctor data.  Redirecting to login.");
                        window.location.href = '/login';
                    });
                } else {
                    alert("Invalid user type selected.");
                }
            } catch (error) {
                console.error("Error logging in:", error);
                alert(`Login failed: ${error.message}`);
            }
        });
    }

    // Logout functionality
      const logoutButtons = document.querySelectorAll('.logout-button');  // Select all logout buttons
      logoutButtons.forEach(button => {
        button.addEventListener('click', async () => {
          try {
            await signOut(auth);
            localStorage.removeItem('patientName');
            localStorage.removeItem('doctorName');
            window.location.href = '/login';
          } catch (error) {
            console.error("Error signing out:", error);
            alert(error.message);
          }
        });
      });

    //check if user is logged in and redirect
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("onAuthStateChanged: User is logged in:", user);
            // User is signed in, determine their role and redirect
            // *** IMPORTANT CHANGE:  Check the correct collection based on user role ***
            const userRef = (user.role === 'patient') ? doc(db, "patients", user.uid) :  doc(db, "doctors", user.uid); //CHANGED BACK TO DOCTORS

            getDoc(userRef).then((docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    console.log("User data from Firestore:", userData);
                    if (userData.role === 'patient') {
                        window.location.href = '/dashboard_patient.html'; // Corrected path
                        // *** NEW: Start Real-time Data Collection for Patient ***
                        startRealTimeData('patient', user.uid); // Pass the user ID and role
                        // *** END: Real-time Data Collection ***
                    } else if (userData.role === 'doctor') {
                        const doctorRef = doc(db, "doctors", user.uid);
                        getDoc(doctorRef).then((doctorSnap) => {
                            if (doctorSnap.exists()) {
                                const doctorData = docSnap.data();
                                console.log("Doctor data from Firestore:", doctorData);
                                if (doctorData.verificationStatus === 'verified') {
                                    window.location.href = '/dashboard_doctor.html'; // Corrected path
                                    // *** NEW: Start Real-time Data Collection for Doctor ***
                                    startRealTimeData('doctor', user.uid); // Pass the user ID and role
                                    // *** END: Real-time Data Collection ***
                                } else {
                                    window.location.href = '/login';
                                }
                            }
                             else{
                                 console.error("Doctor does not exist")
                                 window.location.href = '/login' //added this
                             }
                        }).catch(err =>{  //added error
                            console.error("Error fetching doctor data", err);
                            alert("Error fetching doctor data.  Redirecting to login.");
                            window.location.href = '/login';
                        });

                    }
                } else {
                    console.log("User document does not exist");
                    window.location.href = '/login';
                }
            }).catch(err =>{  //added error
                console.error("Error fetching user data", err);
                alert("Error fetching user data.  Redirecting to login.");
                window.location.href = '/login';
            });

        } else {
            // User is signed out
            console.log("onAuthStateChanged: User is logged out");
            window.location.href = '/login';
        }
    });


    // *** NEW FUNCTION: Real-time Data Collection from ESP32 ***
    function startRealTimeData(userRole, userId) {
        let sensorDataRef;
        if (userRole === 'patient') {
            // 1.  Path for patient data.
            sensorDataRef = doc(db, "sensorData", userId);  // Use userId
        } else if (userRole === 'doctor') {
            // 2.  Path for doctor.  Get data for all patients of that doctor.
             sensorDataRef = collection(db, "sensorData");
        }


        // 2.  Set up a listener for changes to that document or collection.
        onSnapshot(sensorDataRef, (snapshot) => {
            if (userRole === 'patient') {
                // Handle patient data
                 if (snapshot.exists()) {
                    const data = snapshot.data();
                    console.log("Received data from ESP32 for patient:", data);  // Debugging: Check the data

                    // 3.  Update the UI with the received data.
                    if (data.heartRate) {
                        document.getElementById('heartRate').textContent = data.heartRate + " bpm";
                    }
                    if (data.temperature) {
                        document.getElementById('temperature').textContent = data.temperature + " °C";
                    }
                    if (data.bloodPressure) {
                        document.getElementById('bloodPressure').textContent = data.bloodPressure;
                    }
                } else {
                    console.log("No sensor data available yet for this patient.");
                }
            } else if (userRole === 'doctor') {
                  // Handle doctor data.
                  snapshot.forEach((doc) => {
                    const patientData = doc.data();
                    const patientId = doc.id;
                    console.log(`Received data from ESP32 for patient: ${patientId}`, patientData);

                    // Update UI for each patient.  You'll need to adapt this to your HTML structure.
                    // For example, you might have a list of patients in the UI, and you'll need to
                    // find the correct element to update based on the patientId.
                    if (patientData.heartRate) {
                         const heartRateElement = document.getElementById(`heartRate_${patientId}`); // Example
                         if(heartRateElement){
                            heartRateElement.textContent = patientData.heartRate + " bpm";
                         }

                    }
                    if (patientData.temperature) {
                         const tempElement = document.getElementById(`temperature_${patientId}`);  // Example
                         if(tempElement){
                             tempElement.textContent = patientData.temperature + " °C";
                         }
                    }
                    if (patientData.bloodPressure) {
                        const bpElement = document.getElementById(`bloodPressure_${patientId}`);    // Example
                        if(bpElement){
                             bpElement.textContent = patientData.bloodPressure;
                        }
                    }
                });
            }


        }, (error) => {
            console.error("Error getting sensor data:", error);
        });
    }
    // *** END OF NEW FUNCTION ***
});
