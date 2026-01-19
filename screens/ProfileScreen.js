import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";
import { Ionicons } from "@expo/vector-icons";
import Swiper from "react-native-swiper";

export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [initials, setInitials] = useState("");

  const [desc, setDesc] = useState("");
  const [age, setAge] = useState("");
  const [role, setRole] = useState("");

  const [profileExists, setProfileExists] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Blog deletion confirmation
  const [showDeleteBlogConfirm, setShowDeleteBlogConfirm] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);

  // Custom alert state
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const alertAnim = useRef(new Animated.Value(0)).current;

  // Settings popup
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);

  // Logout confirmation
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Delete account confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Blogs state
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    getUser();
    loadToken();
  }, []);

  useEffect(() => {
    if (userEmail) fetchBlogs();
  }, [userEmail]);

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

  const getUser = async () => {
    try {
      const user = await AsyncStorage.getItem("user");
      if (user) {
        const parsedUser = JSON.parse(user);
        setUserName(parsedUser.name);
        setUserEmail(parsedUser.email);
        setInitials(getInitials(parsedUser.name));
        fetchProfile(parsedUser.email);
      }
    } catch (err) {
      console.log("User fetch error:", err);
    }
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0].toUpperCase())
      .join("") || "";

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://192.168.100.77:5000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setDesc(data.desc);
        setAge(String(data.age));
        setRole(data.role);
        setProfileExists(true);
        setEditMode(false);
      } else {
        setProfileExists(false);
      }
    } catch (err) {
      console.log("Profile fetch error:", err);
    }
  };

  const handleSaveProfile = async () => {
    if (!desc || !age || !role) {
      showAlert("Please fill all fields", "error");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return showAlert("No token found", "error");

      const res = await fetch("http://192.168.100.77:5000/api/profile", {
        method: profileExists ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ desc, age: Number(age), role }),
      });

      const data = await res.json();

      if (res.ok) {
        showAlert(data.message, "success");
        setProfileExists(true);
        setEditMode(false);
      } else {
        showAlert(data.message || "Failed to save profile", "error");
      }
    } catch (err) {
      console.log("Save error:", err);
      showAlert("Server error", "error");
    }
  };

  const loadToken = async () => {
    const token = await AsyncStorage.getItem("token");
    if (!token) navigation.replace("LoginScreen");
  };

  // Logout functions
  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setShowSettingsPopup(false);
    showAlert("Logging out...", "success");
    setTimeout(async () => {
      await AsyncStorage.multiRemove(["token", "user"]);
      navigation.replace("LoginScreen");
    }, 500);
  };
  const cancelLogout = () => setShowLogoutConfirm(false);

  // Delete account function
  const confirmDeleteAccount = async () => {
    setShowDeleteConfirm(false);
    setShowSettingsPopup(false);
    showAlert("Deleting account...", "error");

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) throw new Error("No token found");

      const res = await fetch(
        "http://192.168.100.77:5000/api/auth/delete-account",
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await res.json();

      if (res.ok) {
        await AsyncStorage.multiRemove(["token", "user"]);
        showAlert("Account deleted successfully", "success");
        setTimeout(() => {
          navigation.replace("LoginScreen");
        }, 1000);
      } else {
        showAlert(data.message || "Failed to delete account", "error");
      }
    } catch (err) {
      console.log("Delete account error:", err);
      showAlert("Server error", "error");
    }
  };

  const EditableInput = ({
    value,
    onChangeText,
    placeholder,
    keyboardType,
  }) => (
    <TextInput
      style={[styles.input, profileExists && !editMode && styles.disabledInput]}
      placeholder={placeholder}
      placeholderTextColor="#aaa"
      value={value}
      onChangeText={onChangeText}
      editable={true}
      keyboardType={keyboardType || "default"}
      onFocus={() => {
        if (profileExists && !editMode) setEditMode(true);
      }}
    />
  );

  const fetchBlogs = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://192.168.100.77:5000/api/my-blogs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      }
    } catch (err) {
      console.log("Fetch blogs error:", err);
    }
  };

  // Trigger the confirmation popup
  const confirmDeleteBlog = (id) => {
    setBlogToDelete(id);
    setShowDeleteBlogConfirm(true);
  };

  const handleDeleteBlog = async () => {
    if (!blogToDelete) return;

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return showAlert("No token found", "error");

      const res = await fetch(
        `http://192.168.100.77:5000/api/my-blogs/${blogToDelete}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        showAlert("Blog deleted successfully", "success");
        fetchBlogs();
      } else {
        const data = await res.json();
        showAlert(data.message || "Failed to delete blog", "error");
      }
    } catch (err) {
      console.log("Delete blog error:", err);
      showAlert("Server error", "error");
    } finally {
      setShowDeleteBlogConfirm(false);
      setBlogToDelete(null);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.username}>{userName || "Guest"}</Text>
          <TouchableOpacity
            onPress={() => setShowSettingsPopup((prev) => !prev)}
            style={styles.settingsBtn}
          >
            <Ionicons name="settings-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Settings popup */}
        {showSettingsPopup && (
          <View style={styles.settingsPopup}>
            <TouchableOpacity
              style={styles.popupItem}
              onPress={() => setShowLogoutConfirm(true)}
            >
              <Text style={styles.popupItemText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.popupItem}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text style={[styles.popupItemText, { color: "#e74c3c" }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "G"}</Text>
        </View>

        {/* Email */}
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={userEmail}
          editable={false}
        />

        {/* Profile fields */}
        <EditableInput
          placeholder="Description"
          value={desc}
          onChangeText={setDesc}
        />
        <EditableInput
          placeholder="Age"
          value={age}
          keyboardType="numeric"
          onChangeText={setAge}
        />
        <EditableInput placeholder="Role" value={role} onChangeText={setRole} />

        {/* Save button */}
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

        {/* Blogs section */}
        <View style={styles.BlogContainer}>
          <Text style={styles.BlogText}>Your Blogs</Text>

          {blogs.length === 0 ? (
            <Text style={{ color: "#888", marginTop: 10 }}>No blogs yet.</Text>
          ) : (
            <View style={{ height: 300, marginTop: 15 }}>
              <Swiper
                showsPagination={true}
                autoplay={false}
                loop={false}
                activeDotColor="#2ecc71"
                dotColor="#555"
              >
                {blogs.map((blog) => (
                  <View
                    key={blog._id}
                    style={{
                      backgroundColor: "#111",
                      borderRadius: 15,
                      marginHorizontal: 10,
                      padding: 15,
                      flex: 1,
                      justifyContent: "space-between",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      {blog.name}
                    </Text>
                    <Text style={{ color: "#aaa", marginVertical: 5 }} numberOfLines={5} ellipsizeMode="tail">
                      {blog.desc}
                    </Text>
                    <View style={styles.blogcategoryContainer}>
                      <Text style={styles.categoryHeading}>Category:</Text>
                      <Text style={styles.blogCategory}>{blog.category}</Text>
                    </View>
                    <Text style={{ color: "#888", fontSize: 12 }}>
                      {new Date(blog.publishedAt).toDateString()}
                    </Text>

                    <TouchableOpacity
                      style={{
                        marginTop: 10,
                        backgroundColor: "#e74c3c",
                        padding: 8,
                        borderRadius: 10,
                        alignItems: "center",
                      }}
                      onPress={() => confirmDeleteBlog(blog._id)}
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

      {/* Custom Alert */}
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

      {/* Logout Modal */}
      {showLogoutConfirm && (
        <View style={styles.logoutConfirmOverlay}>
          <View style={styles.logoutConfirmBox}>
            <Text style={styles.logoutConfirmText}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.logoutButtonsContainer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelLogout}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <View style={styles.logoutConfirmOverlay}>
          <View style={styles.logoutConfirmBox}>
            <Text style={styles.logoutConfirmText}>
              Are you sure you want to delete your account? This action cannot
              be undone.
            </Text>
            <View style={styles.logoutButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={confirmDeleteAccount}
              >
                <Text style={styles.confirmBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Delete Blog Confirmation Modal */}
      {showDeleteBlogConfirm && (
        <View style={styles.logoutConfirmOverlay}>
          <View style={styles.logoutConfirmBox}>
            <Text style={styles.logoutConfirmText}>
              Are you sure you want to delete this blog? This action cannot be
              undone.
            </Text>
            <View style={styles.logoutButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowDeleteBlogConfirm(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleDeleteBlog}
              >
                <Text style={styles.confirmBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

// Styles remain unchanged
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    backgroundColor: "#000",
    padding: 20,
    justifyContent: "flex-start",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  settingsBtn: {
    padding: 5,
  },
  settingsPopup: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingVertical: 5,
    width: 140,
    zIndex: 999,
  },
  popupItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  popupItemText: {
    color: "#fff",
    fontSize: 16,
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
  customAlert: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  customAlertText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  logoutConfirmOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  logoutConfirmBox: {
    width: "80%",
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#222",
    alignItems: "center",
  },
  logoutConfirmText: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  logoutButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#555",
    padding: 12,
    borderRadius: 10,
    marginRight: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#e74c3c",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  BlogContainer: {
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  BlogText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
    blogcategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },
  categoryHeading: { color: "#ccc", fontWeight: "bold", marginRight: 5 },
  blogCategory: { color: "#2ecc71", fontWeight: "bold" },
});
