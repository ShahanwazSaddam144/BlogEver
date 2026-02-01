import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  Platform,
} from "react-native";
import { useState, useEffect, useRef, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";
import { Ionicons } from "@expo/vector-icons";
import Swiper from "react-native-swiper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { secureFetch } from "api/apiClient";

// Move Input outside to fix the "one char focus loss" bug
const EditableInput = ({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  style,
}) => (
  <TextInput
    style={[styles.input, style, !editable && styles.disabledInput]}
    placeholder={placeholder}
    placeholderTextColor="#aaa"
    value={value}
    onChangeText={onChangeText}
    editable={editable}
    keyboardType={keyboardType || "default"}
  />
);

export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [initials, setInitials] = useState("");
  const [desc, setDesc] = useState("");
  const [role, setRole] = useState("");
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [blogs, setBlogs] = useState([]);

  // UI States
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const alertAnim = useRef(new Animated.Value(0)).current;
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteBlogConfirm, setShowDeleteBlogConfirm] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);

  const age = useMemo(() => {
    const today = new Date();
    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) calculatedAge--;
    return calculatedAge < 0 ? 0 : calculatedAge;
  }, [dob]);

  useEffect(() => {
    initializeData();
  }, []);

  const showAlert = (message, type = "success") => {
    setAlertMessage(message);
    setAlertType(type);
    Animated.timing(alertAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(alertAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 2000);
    });
  };

  const initializeData = async () => {
    try {
      // 1. Get basic user info from login session
      const user = await AsyncStorage.getItem("user");
      if (user) {
        const parsed = JSON.parse(user);
        setUserName(parsed.name);
        setUserEmail(parsed.email);
        setInitials(
          parsed.name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase(),
        );
      }

      // 2. Load cached profile from AsyncStorage first (Instant UI)
      const cachedInfo = await AsyncStorage.getItem("my-info");
      if (cachedInfo) {
        const data = JSON.parse(cachedInfo);
        applyProfileData(data);
      }

      // 3. Fetch fresh data from server
      fetchFreshProfile();
      fetchBlogs();
    } catch (err) {
      console.log("Init Error:", err);
    }
  };

  const applyProfileData = (data) => {
    setDesc(data.desc || "");
    setRole(data.role || "");
    if (data.dob) setDob(new Date(data.dob));
    setProfileExists(true);
  };

  const fetchFreshProfile = async () => {
    try {
      const res = await secureFetch("/api/my-info");
      if (res.ok) {
        const data = await res.json();
        // Update Cache
        await AsyncStorage.setItem("my-info", JSON.stringify(data));
        applyProfileData(data);
      }
    } catch (err) {
      console.log("Profile Sync Error:", err);
    }
  };

  const fetchBlogs = async () => {
    try {
      const res = await secureFetch("/api/blogs/my-blogs");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      }
    } catch (err) {
      console.log("Blog Fetch Error:", err);
    }
  };
  const handleLogout = async () => {
    try {
      const keysToRemove = ["user", "accessToken", "refreshToken"];
      await AsyncStorage.multiRemove(keysToRemove);

      // Close popups
      setShowLogoutConfirm(false);
      setShowSettingsPopup(false);

      // Reset navigation to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (err) {
      console.error("Logout Error:", err);
      showAlert("Error logging out", "error");
    }
  };
  const handleSaveProfile = async () => {
    if (!desc || !role) return showAlert("Fill all fields", "error");

    try {
      const res = await secureFetch("/api/profile", {
        method: profileExists ? "PUT" : "POST",
        body: JSON.stringify({ desc, dob: dob.toISOString(), role }),
      });

      if (res.ok) {
        showAlert("Profile Updated!", "success");
        setEditMode(false);
        fetchFreshProfile();
      } else {
        showAlert("Failed to save", "error");
      }
    } catch (err) {
      showAlert("Server error", "error");
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setDob(selectedDate);
      if (profileExists) setEditMode(true);
    }
  };

  const handleDeleteBlog = async () => {
    try {
      const res = await secureFetch(`/api/my-blogs/${blogToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showAlert("Deleted!", "success");
        fetchBlogs();
      }
    } catch (err) {
      showAlert("Error deleting", "error");
    } finally {
      setShowDeleteBlogConfirm(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.username}>{userName || "Guest"}</Text>
          <TouchableOpacity
            onPress={() => setShowSettingsPopup(!showSettingsPopup)}
          >
            <Ionicons name="settings-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {showSettingsPopup && (
          <View style={styles.settingsPopup}>
            <TouchableOpacity
              style={styles.popupItem}
              onPress={handleLogout} 
            >
              <Ionicons
                name="log-out-outline"
                size={18}
                color="#e74c3c"
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.popupItemText, { color: "#e74c3c" }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "G"}</Text>
        </View>

        <EditableInput
          value={userEmail}
          editable={false}
          style={styles.disabledInput}
        />

        <EditableInput
          placeholder="Description"
          value={desc}
          onChangeText={(t) => {
            setDesc(t);
            if (profileExists) setEditMode(true);
          }}
        />

        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color="#2ecc71"
            style={{ marginRight: 10 }}
          />
          <Text style={{ color: "#fff" }}>
            {dob.toDateString()} (Age: {age})
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dob}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        <EditableInput
          placeholder="Role"
          value={role}
          onChangeText={(t) => {
            setRole(t);
            if (profileExists) setEditMode(true);
          }}
        />

        {(!profileExists || editMode) && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProfile}
          >
            <Text style={styles.saveButtonText}>
              {profileExists ? "Update Profile" : "Save Profile"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Blogs Swiper Section */}
        <View style={styles.BlogContainer}>
          <Text style={styles.BlogText}>Your Blogs</Text>
          {blogs.length === 0 ? (
            <Text style={{ color: "#888", marginTop: 10 }}>No blogs yet.</Text>
          ) : (
            <View style={{ height: 480, marginTop: 15 }}>
              <Swiper
                showsPagination
                activeDotColor="#2ecc71"
                loadMinimal
                loadMinimalSize={1}
              >
                {blogs.map((blog) => (
                  <View key={blog._id} style={styles.cardContainer}>
                    <Image
                      source={{
                        uri:
                          blog.image?.url ||
                          "https://placehold.co/600x400/222/FFF.png?text=No+Image",
                      }}
                      style={styles.cardImage}
                    />
                    <Text style={styles.cardTitle}>{blog.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {blog.desc}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        setBlogToDelete(blog._id);
                        setShowDeleteBlogConfirm(true);
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Swiper>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomBar />

      {/* Alert Component */}
      {alertMessage.length > 0 && (
        <Animated.View
          style={[
            styles.customAlert,
            {
              opacity: alertAnim,
              backgroundColor: alertType === "success" ? "#2ecc71" : "#e74c3c",
            },
          ]}
        >
          <Text style={styles.customAlertText}>{alertMessage}</Text>
        </Animated.View>
      )}

      {/* Add your Confirmation Modals here (Delete/Logout) */}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  settingsPopup: {
    position: "absolute",
    top: 80,
    right: 20,
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 5,
    width: 140,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: "#222",
  },
  popupItem: { padding: 12 },
  popupItemText: { color: "#fff", fontSize: 14 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  username: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  input: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 15,
    color: "#fff",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#222",
  },
  disabledInput: { opacity: 0.6 },
  datePickerButton: {
    width: "100%",
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  saveButton: {
    width: "100%",
    backgroundColor: "#2ecc71",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "bold" },
  BlogContainer: { marginTop: 30, width: "100%" },
  BlogText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  cardContainer: {
    backgroundColor: "#111",
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 5,
  },
  cardImage: { width: "100%", height: 200, borderRadius: 10, marginBottom: 10 },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  cardDesc: { color: "#aaa", fontSize: 14, marginVertical: 5 },
  deleteButton: {
    backgroundColor: "#e74c3c",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  customAlert: {
    position: "absolute",
    bottom: 100,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 10,
    zIndex: 2000,
  },
  customAlertText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
});
