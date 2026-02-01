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
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
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
  // Profile fields / UI
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [initials, setInitials] = useState("");
  const [desc, setDesc] = useState("");
  const [role, setRole] = useState("");
  const [dob, setDob] = useState(null); // null = not set
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Original server profile snapshot (for diffing)
  const [originalProfile, setOriginalProfile] = useState(null);

  const [profileExists, setProfileExists] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [blogs, setBlogs] = useState([]);

  // UI states
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const alertAnim = useRef(new Animated.Value(0)).current;
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteBlogConfirm, setShowDeleteBlogConfirm] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);

  // Web date pickers
  const [webYear, setWebYear] = useState(null);
  const [webMonth, setWebMonth] = useState(null);
  const [webDay, setWebDay] = useState(null);

  // computed age from DOB
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

  // prepare web pickers initial values from existing dob
  useEffect(() => {
    if (Platform.OS === "web") {
      if (dob) {
        setWebYear(dob.getFullYear());
        setWebMonth(dob.getMonth());
        setWebDay(dob.getDate());
      } else {
        const t = new Date();
        setWebYear(t.getFullYear());
        setWebMonth(t.getMonth());
        setWebDay(t.getDate());
      }
    }
  }, [dob]);

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
      await fetchUserInfo();

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

      const cachedInfo = await AsyncStorage.getItem("my-info");
      if (cachedInfo) {
        const data = JSON.parse(cachedInfo);
        applyProfileData(data);
      }
    } catch (err) {
      console.log("Init Error:", err);
    }
  };

  // Apply profile and save snapshot for diffing
  const applyProfileData = (data) => {
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

    const foundBlogs =
      data.blogs ||
      data.userBlogs ||
      data.blogList ||
      (data.user && data.user.blogs) ||
      [];
    setBlogs(foundBlogs || []);

    const exists = !!(
      data.desc ||
      data.role ||
      data.dob ||
      (typeof data.age === "number" && data.age > 0)
    );
    setProfileExists(exists);

    // Save a clean snapshot for diffing
    setOriginalProfile({
      desc: data.desc || "",
      role: data.role || "",
      dob: data.dob ? new Date(data.dob).toISOString() : null,
      // store other useful fields if needed
      name: data.name || null,
      email: data.email || null,
    });
  };

  const fetchUserInfo = async () => {
    try {
      const res = await secureFetch("/api/users/info");
      if (res.ok) {
        const data = await res.json();
        await AsyncStorage.setItem("my-info", JSON.stringify(data));
        applyProfileData(data);
      } else {
        console.log("fetchUserInfo: server responded not OK", res.status);
      }
    } catch (err) {
      console.log("fetchUserInfo Error:", err);
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

  // Open date methods
  const openDatePicker = () => {
    if (Platform.OS === "web") {
      if (!webYear || webMonth === null || !webDay) {
        const t = new Date();
        setWebYear(t.getFullYear());
        setWebMonth(t.getMonth());
        setWebDay(t.getDate());
      }
      setShowDatePicker(true);
    } else {
      setShowDatePicker(true);
    }
  };

  // Cross-platform date change handler
  const onNativeDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event?.type === "set" && selectedDate) {
        setDob(selectedDate);
        if (profileExists) setEditMode(true);
      }
    } else if (Platform.OS === "ios") {
      if (selectedDate) {
        setDob(selectedDate);
        if (profileExists) setEditMode(true);
      }
    } else {
      if (selectedDate) {
        setDob(selectedDate);
        if (profileExists) setEditMode(true);
      }
    }
  };

  const confirmWebDate = () => {
    if (!webYear || webMonth === null || !webDay) {
      showAlert("Please select year / month / day", "error");
      return;
    }
    const d = new Date(webYear, webMonth, webDay);
    setDob(d);
    setShowDatePicker(false);
    if (profileExists) setEditMode(true);
  };

  // ---------- NEW: Save only changed fields (PATCH) ----------
  const handleSaveProfile = async () => {
    // Build diff against originalProfile snapshot
    const trimmedDesc = desc ? desc.trim() : "";
    const trimmedRole = role ? role.trim() : "";

    const changes = {};

    if (!originalProfile) {
      // No snapshot — treat everything as potential change (fall back)
      if (trimmedDesc.length > 0) changes.desc = trimmedDesc;
      if (trimmedRole.length > 0) changes.role = trimmedRole;
      changes.dob = dob ? dob.toISOString() : null;
    } else {
      if (trimmedDesc !== (originalProfile.desc || ""))
        changes.desc = trimmedDesc;
      if (trimmedRole !== (originalProfile.role || ""))
        changes.role = trimmedRole;

      const origDobIso = originalProfile.dob || null;
      const currentDobIso = dob ? dob.toISOString() : null;
      if (origDobIso !== currentDobIso) {
        changes.dob = currentDobIso; // could be null
      }
    }

    // If nothing changed, show message
    if (Object.keys(changes).length === 0) {
      return showAlert("No changes to save", "error");
    }

    // Edge-case validations:
    if (changes.dob) {
      const picked = new Date(changes.dob);
      if (isNaN(picked.getTime())) return showAlert("Invalid date", "error");
      if (picked > new Date())
        return showAlert("DOB cannot be in the future", "error");
    }

    if (changes.desc && changes.desc.length > 800)
      return showAlert("Description too long", "error");
    if (changes.role && changes.role.length > 200)
      return showAlert("Role too long", "error");

    // Optimistic UI: update cached originalProfile & local UI while saving
    const optimisticProfile = {
      ...(originalProfile || {}),
      ...(changes.desc !== undefined ? { desc: changes.desc } : {}),
      ...(changes.role !== undefined ? { role: changes.role } : {}),
      ...(changes.dob !== undefined ? { dob: changes.dob } : {}),
    };

    // Update local snapshot & cache immediately
    setOriginalProfile(optimisticProfile);
    await AsyncStorage.setItem(
      "my-info",
      JSON.stringify({
        ...((await AsyncStorage.getItem("my-info"))
          ? JSON.parse(await AsyncStorage.getItem("my-info"))
          : {}),
        desc: optimisticProfile.desc,
        role: optimisticProfile.role,
        dob: optimisticProfile.dob,
      }),
    );

    try {
      const res = await secureFetch("/api/users/info", {
        method: "PATCH",
        body: JSON.stringify(changes),
      });

      if (res.ok) {
        const updated = await res.json();
        // apply returned authoritative profile
        applyProfileData(updated);
        showAlert("Profile saved", "success");
        setEditMode(false);
        // refresh blogs if server returned changed blog set or you want sync
        await fetchBlogs();
      } else if (res.status === 409) {
        // conflict — reload server copy
        showAlert("Profile conflict — reloading", "error");
        await fetchUserInfo();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.log("Server Error Data:", errorData);
        // reverse optimistic changes on failure: reload cache
        showAlert("Failed to save profile", "error");
        await fetchUserInfo();
      }
    } catch (err) {
      console.error("Save Profile Error:", err);
      showAlert("Server error", "error");
      await fetchUserInfo();
    }
  };

  // Delete blog
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

  // Utility lists for web pickers
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 1900; y--) years.push(y);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {/* header, settings, avatar, inputs etc. (unchanged UI) */}
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
            setEditMode(true);
          }}
        />

        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={openDatePicker}
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

        {/* Native date picker */}
        {showDatePicker && Platform.OS !== "web" && (
          <DateTimePicker
            value={dob || new Date()}
            mode="date"
            display={Platform.OS === "android" ? "calendar" : "spinner"}
            onChange={onNativeDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Web modal date picker */}
        <Modal
          visible={showDatePicker && Platform.OS === "web"}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.webDateModal}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Picker
                    selectedValue={webYear}
                    onValueChange={(val) => setWebYear(val)}
                    style={styles.picker}
                  >
                    {years.map((y) => (
                      <Picker.Item key={y} label={String(y)} value={y} />
                    ))}
                  </Picker>
                </View>
                <View style={{ width: 110, marginHorizontal: 3 }}>
                  <Picker
                    selectedValue={webMonth}
                    onValueChange={(val) => setWebMonth(val)}
                    style={styles.picker}
                  >
                    {months.map((m, idx) => (
                      <Picker.Item key={m} label={m} value={idx} />
                    ))}
                  </Picker>
                </View>
                <View style={{ width: 90, marginLeft: 6 }}>
                  <Picker
                    selectedValue={webDay}
                    onValueChange={(val) => setWebDay(val)}
                    style={styles.picker}
                  >
                    {Array.from(
                      {
                        length: daysInMonth(
                          webYear || currentYear,
                          webMonth || 0,
                        ),
                      },
                      (_, i) => i + 1,
                    ).map((d) => (
                      <Picker.Item key={d} label={String(d)} value={d} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmWebDate}
                >
                  <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                    Confirm
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <EditableInput
          placeholder="Role"
          value={role}
          onChangeText={(t) => {
            setRole(t);
            setEditMode(true);
          }}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
          <Text style={styles.saveButtonText}>
            {profileExists ? "Update Profile" : "Save Profile"}
          </Text>
        </TouchableOpacity>

        {/* Blogs vertical list (unchanged) */}
        <View style={styles.BlogContainer}>
          <Text style={styles.BlogText}>Your Blogs</Text>
          {blogs.length === 0 ? (
            <Text style={{ color: "#888", marginTop: 10 }}>No blogs yet.</Text>
          ) : (
            <View style={{ width: "100%", marginTop: 15 }}>
              {blogs.map((blog) => (
                <View
                  key={blog._id || blog.id}
                  style={[styles.cardContainer, styles.verticalCard]}
                >
                  <Image
                    source={{
                      uri:
                        blog.image?.url ||
                        "https://placehold.co/600x400/222/FFF.png?text=No+Image",
                    }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{blog.name}</Text>
                    <Text style={styles.cardDesc} numberOfLines={3}>
                      {blog.desc}
                    </Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() =>
                          navigation.navigate("FullBlogScreen", {
                            blogId: blog._id || blog.id,
                          })
                        }
                      >
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>
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
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomBar />

      {/* Logout confirmation modal */}
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
                onPress={() => {
                  /* call handleLogout or navigation reset */
                }}
              >
                <Text style={[styles.modalButtonText, { color: "#fff" }]}>
                  Logout
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete blog modal */}
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

      {/* Alert */}
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
  // ... (keep your existing styles — omitted here to save space but you can reuse the ones from your file)
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
    padding: 0,
    marginHorizontal: 0,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
  },
  verticalCard: { flexDirection: "column" },
  cardImage: { width: "100%", height: 180 },
  cardBody: { padding: 12 },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  cardDesc: { color: "#aaa", fontSize: 14, marginBottom: 10 },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewButton: {
    backgroundColor: "#2ecc71",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  viewButtonText: { color: "#fff", fontWeight: "700" },
  deleteButton: {
    backgroundColor: "#e74c3c",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  webDateModal: {
    width: "100%",
    maxWidth: 620,
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#222",
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
  modalBody: { color: "#ddd", fontSize: 14, marginBottom: 16 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end" },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  modalButtonText: { color: "#111", fontWeight: "700" },
  cancelButton: { backgroundColor: "#ddd" },
  confirmButton: { backgroundColor: "#2ecc71" },
  deleteConfirmButton: { backgroundColor: "#e74c3c" },
  picker: { color: "#fff", backgroundColor: "#111" },
});
