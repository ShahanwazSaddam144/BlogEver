import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from "@expo/vector-icons";

export default function AuthScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Custom popup
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  const showPopup = (message) => {
    setPopupMessage(message);
    setPopupVisible(true);
  };

  const handleSignup = async () => {
    if (!name || !email || !password) {
      showPopup("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (res.status === 201) {
        showPopup(
          "Account created! Please check your email and click 'Verify Account' before logging in."
        );
        setIsSignup(false);
        setName("");
        setPassword("");
      } else {
        showPopup(data.message || "Something went wrong");
      }
    } catch (err) {
      showPopup("Server not reachable");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 LOGIN
  const handleLogin = async () => {
    if (!email || !password) {
      showPopup("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.status === 200) {
        const {user,accessToken,refreshToken}=data;
        await AsyncStorage.setItem("user", JSON.stringify(user));
         await AsyncStorage.setItem("accessToken", accessToken);
         await AsyncStorage.setItem("refreshToken", refreshToken);
        navigation.replace("HomeScreen");
      } else {
        showPopup(data.message || "Invalid credentials");
      }
    } catch (err) {
      showPopup("Server not reachable");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isSignup ? "Sign Up" : "Login"}</Text>

      {isSignup && (
        <TextInput
          placeholder="Name"
          placeholderTextColor="#777"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
      )}

      <TextInput
        placeholder="Email"
        placeholderTextColor="#777"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#777"
          style={[styles.input, { flex: 1 }]}
          value={password}
          secureTextEntry={!showPassword}
          onChangeText={setPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={{ padding: 10 }}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={isSignup ? handleSignup : handleLogin}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>
            {isSignup ? "Sign Up" : "Login"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setIsSignup(!isSignup)}
        style={{ marginTop: 15 }}
      >
        <Text style={styles.toggleText}>
          {isSignup
            ? "Already have an account? Login"
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>

      {/* Custom Popup Modal */}
      <Modal
        transparent
        visible={popupVisible}
        animationType="fade"
        onRequestClose={() => setPopupVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalText}>{popupMessage}</Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setPopupVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 10,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#000", fontSize: 16, fontWeight: "bold" },
  toggleText: { color: "#888", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#111",
    padding: 25,
    borderRadius: 12,
    width: "80%",
    alignItems: "center",
  },
  modalText: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 15 },
  modalButton: {
    backgroundColor: "#2ecc71",
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  modalButtonText: { color: "#000", fontWeight: "bold" },
});
