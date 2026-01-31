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
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";
import { Ionicons } from "@expo/vector-icons";
import Swiper from "react-native-swiper";
import DateTimePicker from "@react-native-community/datetimepicker";

// 1. Define the input component outside to prevent focus loss on re-render
const EditableInput = ({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  style,
}) => (
  <TextInput
    style={[styles.input, style]}
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

  // 2. Date of Birth States
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [profileExists, setProfileExists] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Confirmation/Alert States
  const [showDeleteBlogConfirm, setShowDeleteBlogConfirm] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const alertAnim = useRef(new Animated.Value(0)).current;
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [blogs, setBlogs] = useState([]);

  // 3. Memoized Age Calculation (Handles Edge Case: Birthday today or leap years)
  const age = useMemo(() => {
    const today = new Date();
    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      calculatedAge--;
    }
    return calculatedAge < 0 ? 0 : calculatedAge;
  }, [dob]);

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
        setRole(data.role);
        // Set DOB if it exists in your DB, otherwise keep default
        if (data.dob) setDob(new Date(data.dob));
        setProfileExists(true);
      }
    } catch (err) {
      console.log("Profile fetch error:", err);
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || dob;
    setShowDatePicker(Platform.OS === "ios");
    setDob(currentDate);
    if (!editMode && profileExists) setEditMode(true);
  };

  const handleSaveProfile = async () => {
    if (!desc || !role) {
      showAlert("Please fill all fields", "error");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch("http://192.168.100.77:5000/api/profile", {
        method: profileExists ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // Sending dob instead of just age for better data integrity
        body: JSON.stringify({ desc, dob: dob.toISOString(), role }),
      });

      if (res.ok) {
        showAlert("Profile saved!", "success");
        setProfileExists(true);
        setEditMode(false);
      }
    } catch (err) {
      showAlert("Server error", "error");
    }
  };

  // Rest of your logic (getUser, fetchBlogs, handleDeleteBlog etc.) remains same...
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
      console.log(err);
    }
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0].toUpperCase())
      .join("") || "";

  const loadToken = async () => {
    const token = await AsyncStorage.getItem("refreshToken");
    if (!token) navigation.replace("Login");
  };

  const fetchBlogs = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch("http://192.168.100.77:5000/api/my-blogs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const confirmDeleteBlog = (id) => {
    setBlogToDelete(id);
    setShowDeleteBlogConfirm(true);
  };

  const handleDeleteBlog = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(
        `http://192.168.100.77:5000/api/my-blogs/${blogToDelete}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        showAlert("Blog deleted", "success");
        fetchBlogs();
      }
    } catch (err) {
      console.log(err);
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

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "G"}</Text>
        </View>

        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={userEmail}
          editable={false}
        />

        {/* 4. Desc & Role Inputs */}
        <EditableInput
          placeholder="Description"
          value={desc}
          onChangeText={(t) => {
            setDesc(t);
            if (!editMode && profileExists) setEditMode(true);
          }}
        />

        {/* 5. Date of Birth Picker Button */}
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
            maximumDate={new Date()} // Edge case: Can't be born in the future
          />
        )}

        <EditableInput
          placeholder="Role"
          value={role}
          onChangeText={(t) => {
            setRole(t);
            if (!editMode && profileExists) setEditMode(true);
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

        <View style={styles.BlogContainer}>
          <Text style={styles.BlogText}>Your Blogs</Text>
          {blogs.length === 0 ? (
            <Text style={{ color: "#888", marginTop: 10 }}>No blogs yet.</Text>
          ) : (
            <View style={{ height: 450, marginTop: 15 }}>
              <Swiper
                showsPagination
                activeDotColor="#2ecc71"
                loadMinimal
                loadMinimalSize={2}
              >
                {blogs.map((blog) => (
                  <View key={blog._id} style={styles.cardContainer}>
                    <Image
                      source={{
                        uri:
                          blog.image ||
                          "https://placehold.co/600x400/222/FFF.png?text=No+Image",
                      }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.cardTitle}>{blog.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={3}>
                      {blog.desc}
                    </Text>
                    <View style={styles.blogcategoryContainer}>
                      <Text style={styles.categoryHeading}>Category:</Text>
                      <Text style={styles.blogCategory}>{blog.category}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
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
      {/* Alert and Modals remain same... */}
    </>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
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
    marginTop: 10,
    marginBottom: 20,
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
  popupItem: { paddingVertical: 10, paddingHorizontal: 15 },
  popupItemText: { color: "#fff", fontSize: 16 },
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
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  username: { color: "#fff", fontSize: 18 },
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
  disabledInput: { backgroundColor: "#222", color: "#888" },
  datePickerButton: {
    width: "100%",
    backgroundColor: "#111",
    borderColor: "#222",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  saveButton: {
    width: "100%",
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  BlogContainer: { marginTop: 20, width: "100%", alignItems: "center" },
  BlogText: { color: "white", fontSize: 20, fontWeight: "bold" },
  cardContainer: {
    backgroundColor: "#111",
    borderRadius: 15,
    marginHorizontal: 10,
    padding: 15,
    flex: 1,
  },
  cardImage: { width: "100%", height: 180, borderRadius: 10, marginBottom: 10 },
  cardTitle: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cardDesc: { color: "#aaa", marginVertical: 5 },
  deleteButton: {
    marginTop: 10,
    backgroundColor: "#e74c3c",
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  blogcategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  categoryHeading: { color: "#ccc", fontWeight: "bold", marginRight: 5 },
  blogCategory: { color: "#2ecc71", fontWeight: "bold" },
});
