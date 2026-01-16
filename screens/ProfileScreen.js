import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";

export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [initials, setInitials] = useState("");
  const [desc, setDesc] = useState("");
  const [age, setAge] = useState("");
  const [role, setRole] = useState("");
  const [profileExists, setProfileExists] = useState(false);
  const [userToken, setUserToken] = useState("");

  useEffect(() => {
    getUser();
    loadToken();
  }, []);

  // Fetch user info from AsyncStorage
  const getUser = async () => {
    try {
      const user = await AsyncStorage.getItem("user");
      if (user) {
        const parsedUser = JSON.parse(user);
        setUserName(parsedUser.name);
        setUserEmail(parsedUser.email);
        setInitials(getInitials(parsedUser.name));
        fetchProfile(parsedUser.email); // fetch profile using email
      }
    } catch (err) {
      console.log("Error fetching user:", err);
    }
  };

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return "";
    return name
      .split(" ")
      .filter((word) => word.length > 0)
      .slice(0, 3)
      .map((word) => word[0].toUpperCase())
      .join("");
  };

  // Fetch profile from backend
  const fetchProfile = async (email) => {
    try {
      const res = await fetch(`http://192.168.100.77:5000/api/profile?email=${email}`);
      const data = await res.json();
      if (res.ok) {
        setDesc(data.desc);
        setAge(data.age.toString());
        setRole(data.role);
        setProfileExists(true);
      } else {
        setProfileExists(false);
      }
    } catch (err) {
      console.log("Error fetching profile:", err);
    }
  };

  // Save profile to backend
  const handleSaveProfile = async () => {
    if (!desc || !age || !role || !userEmail) {
      alert("Please fill all fields");
      return;
    }

    try {
      const res = await fetch("http://192.168.100.77:5000/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, desc, age: Number(age), role }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setProfileExists(true);
      } else {
        alert(data.message || "Error saving profile");
      }
    } catch (err) {
      console.log("Error saving profile:", err);
      alert("Server error");
    }
  };

  // Load token from AsyncStorage
  const loadToken = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
      navigation.replace("LoginScreen");
    } else {
      setUserToken(token);
    }
  };

  // Logout function
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("token");
              await AsyncStorage.removeItem("user");
              navigation.replace("LoginScreen");
            } catch (error) {
              console.log("Logout error", error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "G"}</Text>
        </View>

        <Text style={styles.username}>{userName || "Guest"}</Text>

        <TextInput
          style={[styles.input, styles.disabledInput]}
          placeholder="Email"
          placeholderTextColor="#aaa"
          value={userEmail}
          editable={false}
        />

        <TextInput
          style={[styles.input, profileExists && styles.disabledInput]}
          placeholder="Description"
          placeholderTextColor="#aaa"
          value={desc}
          onChangeText={setDesc}
          editable={!profileExists}
        />

        <TextInput
          style={[styles.input, profileExists && styles.disabledInput]}
          placeholder="Age"
          placeholderTextColor="#aaa"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          editable={!profileExists}
        />

        <TextInput
          style={[styles.input, profileExists && styles.disabledInput]}
          placeholder="Role"
          placeholderTextColor="#aaa"
          value={role}
          onChangeText={setRole}
          editable={!profileExists}
        />

        {!profileExists && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>Save Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomBar />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#222",
  },
  avatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  username: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 20,
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
  disabledInput: {
    backgroundColor: "#222",
    color: "#888",
  },
  saveButton: {
    width: "100%",
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  logoutButton: {
    width: "100%",
    backgroundColor: "#e74c3c",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
