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
  Modal,
  Pressable,
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
  const [dob, setDob] = useState(null); // null = not set
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

  // derived/computed age from DOB
  const computedAgeFromDob = useMemo(() => {
    if (!dob) return 0;
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
      // 1. Attempt to fetch user info from server first (as requested)
      await fetchUserInfo();

      // 2. Still try to populate instant UI from cached login session
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

      // 3. Load cached profile if present (fallback quick-render)
      const cachedInfo = await AsyncStorage.getItem("my-info");
      if (cachedInfo) {
        const data = JSON.parse(cachedInfo);
        applyProfileData(data);
      }
    } catch (err) {
      console.log("Init Error:", err);
    }
  };

  const applyProfileData = (data) => {
    // data may contain: name, email, desc, role, dob, age, blogs
    if (!data) return;
    if (data.name) {
      setUserName(data.name);
      setInitials(
        data.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase(),
      );
    }
    if (data.email) setUserEmail(data.email);
    setDesc(data.desc || "");
    setRole(data.role || "");

    // Prefer dob if provided. If no dob but age provided, approximate DOB as Jan 1.
    if (data.dob) {
      try {
        setDob(new Date(data.dob));
      } catch (e) {
        setDob(null);
      }
    } else if (typeof data.age === "number" && data.age > 0) {
      const year = new Date().getFullYear() - data.age;
      setDob(new Date(year, 0, 1));
    } else {
      setDob(null);
    }

    // blogs may be returned together
    const foundBlogs =
      data.blogs ||
      data.userBlogs ||
      data.blogList ||
      (data.user && data.user.blogs) ||
      [];
    setBlogs(foundBlogs || []);

    // consider profileExists true if any descriptive field exists
    const exists = !!(
      data.desc ||
      data.role ||
      data.dob ||
      (typeof data.age === "number" && data.age > 0)
    );
    setProfileExists(exists);
  };

  const fetchUserInfo = async () => {
    try {
      const res = await secureFetch("/api/users/info");
      if (res.ok) {
        const data = await res.json();
        // cache
        await AsyncStorage.setItem("my-info", JSON.stringify(data));
        applyProfileData(data);
        // also set top-level user name/email if present in response
        if (data.name) setUserName(data.name);
        if (data.email) setUserEmail(data.email);
        // if server returns blogs at top-level, set them
        const foundBlogs =
          data.blogs ||
          data.userBlogs ||
          data.blogList ||
          (data.user && data.user.blogs) ||
          [];
        setBlogs(foundBlogs || []);
      } else {
        console.log("fetchUserInfo: server responded not OK", res.status);
      }
    } catch (err) {
      console.log("fetchUserInfo Error:", err);
    }
  };

  // Note: keep fetchBlogs for compatibility if your backend has dedicated endpoint
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

    // Compute age from DOB (0 = not set)
    const ageToSend = computedAgeFromDob > 0 ? computedAgeFromDob : 0;

    // Build payload
    const payload = {
      desc,
      role,
      dob: dob ? dob.toISOString() : null,
      age: ageToSend,
    };

    try {
      const res = await secureFetch("/api/user/info", {
        method: profileExists ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showAlert("Profile Updated!", "success");
        setEditMode(false);
        // refresh server data
        await fetchUserInfo();
        await fetchBlogs();
      } else {
        showAlert("Failed to save", "error");
      }
    } catch (err) {
      console.error("Save Profile Error:", err);
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
      } else {
        showAlert("Failed to delete", "error");
      }
    } catch (err) {
      showAlert("Error deleting", "error");
    } finally {
      setShowDeleteBlogConfirm(false);
      setBlogToDelete(null);
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
              onPress={() => setShowLogoutConfirm(true)}
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
            {dob ? dob.toDateString() : "Pick DOB"} (Age:{" "}
            {computedAgeFromDob === 0 ? "Not set" : computedAgeFromDob})
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dob || new Date()}
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
                  <View key={blog._id || blog.id} style={styles.cardContainer}>
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
                        setBlogToDelete(blog._id || blog.id);
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

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to log out? You'll need to sign in again.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleLogout}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                  Logout
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Blog Confirmation Modal */}
      <Modal
        visible={showDeleteBlogConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteBlogConfirm(false);
          setBlogToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Blog</Text>
            <Text style={styles.modalBody}>
              This will permanently delete the selected blog. Are you sure?
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteBlogConfirm(false);
                  setBlogToDelete(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={handleDeleteBlog}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

  /* Modal styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalBody: {
    color: "#ddd",
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  modalButtonText: {
    color: "#111",
    fontWeight: "700",
  },
  cancelButton: {
    backgroundColor: "#ddd",
  },
  confirmButton: {
    backgroundColor: "#e74c3c",
  },
  deleteConfirmButton: {
    backgroundColor: "#e74c3c",
  },
});
