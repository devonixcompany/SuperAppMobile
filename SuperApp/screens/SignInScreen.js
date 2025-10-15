import { View, Text, StyleSheet, TextInput, Button, Platform } from 'react-native';
import React, { useState, useRef } from 'react';
import { FirebaseRecaptchaVerifierModal, FirebaseRecaptchaBanner } from 'expo-firebase-recaptcha';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { app, auth, firebaseConfig } from '../firebaseConfig';

if (!app?.options || Platform.OS === 'web') {
    throw new Error(
        'This example only works on Android or iOS, and requires a valid Firebase config.'
    );
}

const SignInScreen = ({ navigation }) => {
    const recaptchaVerifier = useRef(null);
    
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationId, setVerificationID] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    
    const [info, setInfo] = useState("");
    const attemptInvisibleVerification = false;

    const handleSendVerificationCode = async () => {
        try {
            const phoneProvider = new PhoneAuthProvider(auth);
            const verificationId = await phoneProvider.verifyPhoneNumber(
                phoneNumber,
                recaptchaVerifier.current
            );
            setVerificationID(verificationId);
            setInfo('Success : Verification code has been sent to your phone');
        } catch (error) {
            setInfo(`Error : ${error.message}`);
        }
    };

    const handleVerifyVerificationCode = async () => {
        try {
            const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
            await signInWithCredential(auth, credential);
            setInfo('Success: Phone authentication successful');
            navigation.navigate("Welcome");
        } catch (error) {
            setInfo(`Error : ${error.message}`);
        }
    }

    return (
        <View style={styles.container}>
            <FirebaseRecaptchaVerifierModal
                ref={recaptchaVerifier}
                firebaseConfig={firebaseConfig}
            />

            {
                info && <Text style={styles.text}>{info}</Text>
            }

            {
                !verificationId && (
                    <View>
                        <Text style={styles.text}>Enter the phone number</Text>

                        <TextInput
                            style={styles.input}
                            placeholder='+66812345678'
                            autoFocus
                            autoCompleteType='tel'
                            keyboardType='phone-pad'
                            textContentType='telephoneNumber'
                            onChangeText={(phoneNumber) => setPhoneNumber(phoneNumber)}
                        />

                        <Button
                            onPress={() => handleSendVerificationCode()}
                            title="Send Verification Code"
                            disabled={!phoneNumber}
                        />
                    </View>
                )
            }

            {
                verificationId && (
                    <View>
                        <Text style={styles.text}>Enter the verification code</Text>

                        <TextInput
                            style={styles.input}
                            placeholder='123456'
                            onChangeText={(verificationCode) => setVerificationCode(verificationCode)}
                            keyboardType='number-pad'
                        />

                        <Button
                            onPress={() => handleVerifyVerificationCode()}
                            title="Verify Code"
                            disabled={!verificationCode}
                        />
                    </View>
                )
            }

            {attemptInvisibleVerification && <FirebaseRecaptchaBanner />}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    text: {
        color: "#333",
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 20,
        minWidth: 200,
    }
});

export default SignInScreen;
