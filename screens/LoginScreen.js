import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

function CustomAlert({ visible, message, onClose }) {
  if (!visible) return null;

  return (
    <View style={styles.alertOverlay}>
      <View style={styles.alertBox}>
        <Text style={styles.alertText}>{message}</Text>
        <TouchableOpacity style={styles.alertButton} onPress={onClose}>
          <Text style={styles.alertButtonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LoginScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const BASE_URL = "http://192.168.100.77:5000/api/auth";

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertVisible(true);
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      showAlert("Please fill all fields");
      return;
    }

    try {
      const url = isLogin
        ? `${BASE_URL}/login`
        : `${BASE_URL}/signIn`;

      const body = isLogin
        ? { email, password }
        : { name, email, password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert(data.message || "Authentication failed");
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));

      navigation.replace("HomeScreen");
    } catch (err) {
      showAlert("Server not reachable");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>
        {isLogin ? "Welcome Back" : "Create Account"}
      </Text>

      <Text style={styles.subtitle}>
        {isLogin ? "Login to continue" : "Sign up to explore"}
      </Text>

      {!isLogin && (
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor="#666"
          value={name}
          onChangeText={setName}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={24}
            color="#aaa"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleAuth}>
        <Text style={styles.buttonText}>
          {isLogin ? "Login" : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text style={styles.switchText}>
          {isLogin
            ? "Don't have an account? Create one"
            : "Already have an account? Login"}
        </Text>
      </TouchableOpacity>

      <CustomAlert
        visible={alertVisible}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  subtitle: { color: "#aaa", marginTop: 8, marginBottom: 20 },
  input: {
    width: "100%",
    backgroundColor: "#111",
    borderColor: "#222",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    color: "#fff",
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: "#111",
    borderColor: "#222",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    alignItems: "center",
    marginBottom: 15,
  },
  passwordInput: { flex: 1, color: "#fff", paddingVertical: 15 },
  button: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  switchText: { color: "#888", marginTop: 20, fontSize: 13 },
  alertOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertBox: {
    width: "80%",
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  alertText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 15,
  },
  alertButton: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  alertButtonText: { color: "#000", fontWeight: "bold" },
});
