import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";

export default function LoginScreen({ navigation }) {
  const [name, setName] = useState(""); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true); 
  const [users, setUsers] = useState([]); 
  
  useEffect(() => {
    loadUsers();
    checkLogin();
  }, []);

  const loadUsers = async () => {
    const storedUsers = await AsyncStorage.getItem("users");
    if (storedUsers) setUsers(JSON.parse(storedUsers));
  };

  const checkLogin = async () => {
    const user = await AsyncStorage.getItem("user");
    if (user) {
      navigation.replace("HomeScreen"); 
    }
  };

  // ✅ Login / Signup handler
  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (isLogin) {
      // Login
      const foundUser = users.find(u => u.email === email);
      if (!foundUser) {
        Alert.alert("Error", "User not found");
        return;
      }
      if (foundUser.password !== password) {
        Alert.alert("Error", "Invalid email or password");
        return;
      }
      // Login success
      await AsyncStorage.setItem("user", JSON.stringify(foundUser));
      navigation.replace("HomeScreen");
    } else {
      // Signup
      const exists = users.find(u => u.email === email);
      if (exists) {
        Alert.alert("Error", "User already exists");
        return;
      }

      const newUser = { name, email, password };
      const updatedUsers = [...users, newUser];
      await AsyncStorage.setItem("users", JSON.stringify(updatedUsers));
      await AsyncStorage.setItem("user", JSON.stringify(newUser));
      navigation.replace("HomeScreen");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>
        {isLogin ? "Welcome Back" : "Create Account"}
      </Text>

      <Text style={styles.subtitle}>
        {isLogin ? "Login to continue" : "Join BlogEver today"}
      </Text>

      {/* Name input only for signup */}
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
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

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
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#aaa",
    marginTop: 8,
    marginBottom: 20,
    textAlign: "center",
  },
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
  button: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  switchText: {
    color: "#888",
    marginTop: 20,
    fontSize: 13,
  },
});
