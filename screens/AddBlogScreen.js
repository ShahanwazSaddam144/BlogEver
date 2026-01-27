// src/screens/AddBlogScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import RNPickerSelect from "react-native-picker-select";
import DateTimePicker from "@react-native-community/datetimepicker";
import BottomBar from "../components/BottomBar";
import { secureFetch } from "api/apiClient"; // adjust path if needed
import * as SecureStore from "expo-secure-store";

const CDN_BASE_URL = "https://cdn.example.com"; // change to your CDN domain

export default function AddBlogScreen() {
  // form state
  const [authorName, setAuthorName] = useState("");
  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [category, setCategory] = useState(null);
  const [publishedAt, setPublishedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // image / upload state
  const [localImageUri, setLocalImageUri] = useState(null);
  const [uploadUrl, setUploadUrl] = useState(null);
  const [cdnKey, setCdnKey] = useState(null);
  const [cdnImageUrl, setCdnImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadCompleted, setUploadCompleted] = useState(false);

  // UI / flow
  const [step, setStep] = useState(1); // 1 = form, 2 = preview
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const alertAnim = useRef(new Animated.Value(0)).current;

  const categories = [
    { label: "Coding", value: "Coding" },
    { label: "Entertainment", value: "Entertainment" },
    { label: "Fun", value: "Fun" },
    { label: "Cooking", value: "Cooking" },
    { label: "Travel", value: "Travel" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const userJson = await SecureStore.getItemAsync("user");
        if (userJson) {
          const u = JSON.parse(userJson);
          setAuthorName(u.name || "");
        }
      } catch (err) {
        // ignore
      }
    })();
  }, []);

  const showAlert = (message, type = "success", duration = 2200) => {
    setAlertMessage(message);
    setAlertType(type);
    Animated.timing(alertAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(alertAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }, duration);
    });
  };

  // ------- Image selection + direct CDN upload -------
  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission required", "We need permission to access your photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });

      if (result.cancelled) return;

      setLocalImageUri(result.uri);
      // start upload flow
      await requestUploadTokenAndUpload(result.uri);
    } catch (err) {
      console.log("pickImage error:", err);
      showAlert("Image selection failed", "error");
    }
  };

  const requestUploadTokenAndUpload = async (imageUri) => {
    setUploadError(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadCompleted(false);
    setUploadUrl(null);
    setCdnKey(null);
    setCdnImageUrl(null);

    try {
      // expects backend to return { uploadUrl, cdnKey, cdnUrl? }
      const tokenResp = await secureFetch("/api/upload-token", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenResp.ok) {
        const err = await tokenResp.json().catch(() => ({}));
        throw new Error(err.message || "Failed to get upload token");
      }

      const tokenData = await tokenResp.json();
      const presignedUrl = tokenData.uploadUrl;
      const key = tokenData.cdnKey;
      const cdnUrlFromBackend = tokenData.cdnUrl || (key ? `${CDN_BASE_URL}/${key}` : null);

      if (!presignedUrl || !key) throw new Error("Invalid upload token response");

      setUploadUrl(presignedUrl);
      setCdnKey(key);

      await uploadFileToCdnWithProgress(presignedUrl, imageUri);

      const finalCdnUrl = cdnUrlFromBackend || `${CDN_BASE_URL}/${key}`;
      setCdnImageUrl(finalCdnUrl);
      setUploadCompleted(true);
      showAlert("Image uploaded", "success");
    } catch (err) {
      console.log("upload error:", err);
      setUploadError(err.message || "Upload failed");
      showAlert(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const uploadFileToCdnWithProgress = async (uploadUrl, fileUri) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload network error"));

        xhr.send(blob);
      } catch (err) {
        reject(err);
      }
    });
  };

  // ------- Navigation between steps -------
  const canProceedToPreview = () => {
    if (!title.trim() || !shortDesc.trim() || !category) return false;
    if (localImageUri && !uploadCompleted) return false;
    return true;
  };

  const onNext = () => {
    if (!canProceedToPreview()) {
      showAlert("Please complete required fields (and wait for image)", "error");
      return;
    }
    setStep(2);
  };

  const onBack = () => setStep(1);

  // ------- Create blog (called from preview step) -------
  const createBlog = async () => {
    if (!canProceedToPreview()) {
      showAlert("Please complete required fields", "error");
      return;
    }

    if (cdnImageUrl && !cdnImageUrl.startsWith(CDN_BASE_URL)) {
      showAlert("Invalid image URL", "error");
      return;
    }

    try {
      const payload = {
        name: title,
        desc: shortDesc,
        category,
        publishedAt: new Date(publishedAt),
        cdnImageUrl: cdnImageUrl || null,
        createdby: authorName || undefined,
      };

      const res = await secureFetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showAlert(data.message || "Blog created", "success");
        // reset everything and go back to form
        setTitle("");
        setShortDesc("");
        setCategory(null);
        setPublishedAt(new Date());
        setLocalImageUri(null);
        setUploadUrl(null);
        setCdnKey(null);
        setCdnImageUrl(null);
        setUploadCompleted(false);
        setUploadProgress(0);
        setStep(1);
      } else {
        showAlert(data.message || "Failed to create blog", "error");
      }
    } catch (err) {
      console.log("Create blog error:", err);
      showAlert("Server error", "error");
    }
  };

  // small helpers
  const shortPreview = (text, n = 120) =>
    text ? (text.length > n ? text.substring(0, n - 1) + "…" : text) : "";

  // UI
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header + step indicator */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create a Blog</Text>
            <View style={styles.stepRow}>
              <View style={[styles.stepBullet, step === 1 && styles.stepActive]}>
                <Text style={styles.stepText}>1</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={[styles.stepBullet, step === 2 && styles.stepActive]}>
                <Text style={styles.stepText}>2</Text>
              </View>
            </View>
          </View>

          {step === 1 ? (
            // ---------------- FORM STEP ----------------
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Author</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: "#080808" }]}
                  placeholder="Author"
                  placeholderTextColor="#666"
                  value={authorName}
                  editable={false}
                />

                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter blog title"
                  placeholderTextColor="#666"
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={styles.label}>Short description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Short description visible in lists"
                  placeholderTextColor="#666"
                  value={shortDesc}
                  onChangeText={setShortDesc}
                  multiline
                />

                <Text style={styles.label}>Category</Text>
                <View style={styles.pickerContainer}>
                  <RNPickerSelect
                    onValueChange={(v) => setCategory(v)}
                    items={categories}
                    placeholder={{ label: "Select category", value: null }}
                    value={category}
                    style={{
                      inputIOS: styles.input,
                      inputAndroid: styles.input,
                      placeholder: { color: "#666" },
                    }}
                  />
                </View>

                <Text style={styles.label}>Publish date</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerText}>
                    {publishedAt ? publishedAt.toDateString() : "Select date"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={publishedAt}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setPublishedAt(selectedDate);
                    }}
                  />
                )}

                <Text style={[styles.label, { marginTop: 12 }]}>Cover image (optional)</Text>
                <View style={styles.imageRow}>
                  {localImageUri ? (
                    <Image source={{ uri: localImageUri }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={{ color: "#777" }}>No image</Text>
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={pickImage}
                      disabled={uploading}
                    >
                      <Text style={styles.uploadBtnText}>
                        {localImageUri ? "Change" : "Select"}
                      </Text>
                    </TouchableOpacity>

                    {uploading ? (
                      <View style={{ marginTop: 8 }}>
                        <View style={styles.progressBarBackground}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${uploadProgress}%` },
                            ]}
                          />
                        </View>
                        <Text style={{ color: "#aaa", marginTop: 6 }}>
                          Uploading... {uploadProgress}%
                        </Text>
                      </View>
                    ) : uploadCompleted ? (
                      <Text style={{ color: "#2ecc71", marginTop: 8 }}>Uploaded ✓</Text>
                    ) : uploadError ? (
                      <Text style={{ color: "#e74c3c", marginTop: 8 }}>{uploadError}</Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.rowBetween}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { flex: 1, marginRight: 8 }]}
                    onPress={() => {
                      // reset form
                      setTitle("");
                      setShortDesc("");
                      setCategory(null);
                      setPublishedAt(new Date());
                      setLocalImageUri(null);
                      setUploadCompleted(false);
                      setUploadProgress(0);
                      setCdnImageUrl(null);
                    }}
                  >
                    <Text style={styles.secondaryText}>Reset</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      !canProceedToPreview() && styles.disabledBtn,
                    ]}
                    onPress={onNext}
                    disabled={!canProceedToPreview()}
                  >
                    <Text style={styles.primaryText}>Next: Preview</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            // ---------------- PREVIEW STEP ----------------
            <>
              <View style={styles.card}>
                <Text style={styles.previewHeading}>Preview</Text>

                <View style={styles.previewCard}>
                  {cdnImageUrl ? (
                    <Image source={{ uri: cdnImageUrl }} style={styles.cardImage} />
                  ) : localImageUri ? (
                    <Image source={{ uri: localImageUri }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, styles.imagePlaceholder, { justifyContent: "center" }]}>
                      <Text style={{ color: "#777" }}>No image</Text>
                    </View>
                  )}

                  <Text style={styles.cardTitle}>{title || "Blog title"}</Text>
                  <Text style={styles.cardAuthor}>by {authorName || "Author"}</Text>
                  <Text style={styles.cardDesc}>{shortPreview(shortDesc || "Short description...")}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>Category: {category || "—"}</Text>
                    <Text style={styles.metaText}>{new Date(publishedAt).toDateString()}</Text>
                  </View>
                </View>

                <View style={styles.rowBetween}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
                    <Text style={styles.secondaryText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (uploading || (localImageUri && !uploadCompleted)) && styles.disabledBtn,
                    ]}
                    onPress={createBlog}
                    disabled={uploading || (localImageUri && !uploadCompleted)}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.primaryText}>Create Blog</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

        <BottomBar />

        {/* toast */}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 18,
    backgroundColor: "#000",
    alignItems: "stretch",
  },
  header: {
    marginBottom: 12,
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepBullet: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  stepActive: {
    backgroundColor: "#2ecc71",
  },
  stepText: {
    color: "#fff",
    fontWeight: "700",
  },
  stepLine: {
    height: 2,
    width: 50,
    backgroundColor: "#222",
    marginHorizontal: 8,
  },
  card: {
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#151515",
    // shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
    }),
  },
  label: {
    color: "#bbb",
    marginBottom: 6,
    marginTop: 10,
    fontSize: 13,
  },
  input: {
    width: "100%",
    backgroundColor: "#070707",
    borderColor: "#111",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    color: "#fff",
  },
  textArea: {
    height: 110,
    textAlignVertical: "top",
  },
  pickerContainer: {
    width: "100%",
  },
  datePickerButton: {
    width: "100%",
    backgroundColor: "#070707",
    borderColor: "#111",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  datePickerText: {
    color: "#fff",
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  imagePlaceholder: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#090909",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#111",
  },
  uploadBtn: {
    backgroundColor: "#222",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#0a0a0a",
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 8,
    width: "100%",
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#2ecc71",
    borderRadius: 4,
    width: "0%",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: "#2ecc71",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 120,
    alignItems: "center",
  },
  primaryText: {
    color: "#000",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 120,
    alignItems: "center",
  },
  secondaryText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  previewHeading: {
    color: "#ddd",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  previewCard: {
    backgroundColor: "#080808",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  cardImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#111",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  cardAuthor: {
    color: "#aaa",
    marginTop: 6,
    marginBottom: 8,
  },
  cardDesc: {
    color: "#ccc",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metaText: { color: "#999", fontSize: 12 },
  customAlert: {
    position: "absolute",
    bottom: 80,
    left: 18,
    right: 18,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    zIndex: 999,
  },
  customAlertText: {
    color: "#fff",
    fontWeight: "700",
  },
});
