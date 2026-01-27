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
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import RNPickerSelect from "react-native-picker-select";
import DateTimePicker from "@react-native-community/datetimepicker";
import BottomBar from "../components/BottomBar";
import { secureFetch } from "api/apiClient"; // adjust path if needed
import * as SecureStore from "expo-secure-store";
import Markdown from "react-native-markdown-display"; // install: npm i react-native-markdown-display

const CDN_BASE_URL = "https://cdn.example.com"; // change to your CDN domain

export default function AddBlogScreen() {
  // --------------- form state (meaningful names) ---------------
  const [authorName, setAuthorName] = useState("");
  const [titleText, setTitleText] = useState("");
  const [markdownBody, setMarkdownBody] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [publishDate, setPublishDate] = useState(new Date());
  const [showPublishDatePicker, setShowPublishDatePicker] = useState(false);

  // --------------- image & upload state ---------------
  const [localImageUri, setLocalImageUri] = useState(null);
  const [presignedUploadUrl, setPresignedUploadUrl] = useState(null);
  const [presignedCdnKey, setPresignedCdnKey] = useState(null);
  const [cdnImageUrl, setCdnImageUrl] = useState(null);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgressPercent, setImageUploadProgressPercent] = useState(0);
  const [imageUploadErrorMessage, setImageUploadErrorMessage] = useState(null);
  const [imageUploadCompleted, setImageUploadCompleted] = useState(false);

  // --------------- UI + flow ---------------
  const [currentStep, setCurrentStep] = useState(1); // 1 = edit, 2 = preview
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const alertAnimation = useRef(new Animated.Value(0)).current;

  // fullscreen markdown editor
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const markdownInputRef = useRef(null);

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
          const userObj = JSON.parse(userJson);
          setAuthorName(userObj.name || "");
        }
      } catch (error) {
        // ignore silently
      }
    })();
  }, []);

  // toast helper
  const showToast = (message, type = "success", duration = 2200) => {
    setAlertMessage(message);
    setAlertType(type);
    Animated.timing(alertAnimation, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(alertAnimation, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start();
      }, duration);
    });
  };

  // --------------- image picking & direct CDN upload ---------------
  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "We need permission to access your photos.");
        return;
      }

      const pickResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.75,
        allowsEditing: true,
      });

      if (pickResult.cancelled) return;

      setLocalImageUri(pickResult.uri);
      await requestPresignedUrlAndUpload(pickResult.uri);
    } catch (error) {
      console.log("handlePickImage error:", error);
      showToast("Image selection failed", "error");
    }
  };

  const requestPresignedUrlAndUpload = async (imageUri) => {
    setImageUploadErrorMessage(null);
    setIsUploadingImage(true);
    setImageUploadProgressPercent(0);
    setImageUploadCompleted(false);
    setPresignedUploadUrl(null);
    setPresignedCdnKey(null);
    setCdnImageUrl(null);

    try {
      // backend should return { uploadUrl, cdnKey, cdnUrl? }
      const tokenResponse = await secureFetch("/api/upload-token", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.json().catch(() => ({}));
        throw new Error(tokenError.message || "Failed to request upload token");
      }

      const tokenBody = await tokenResponse.json();
      const presignedUrl = tokenBody.uploadUrl;
      const cdnKey = tokenBody.cdnKey;
      const cdnUrlFromBackend = tokenBody.cdnUrl || (cdnKey ? `${CDN_BASE_URL}/${cdnKey}` : null);

      if (!presignedUrl || !cdnKey) {
        throw new Error("Invalid upload token response from server");
      }

      setPresignedUploadUrl(presignedUrl);
      setPresignedCdnKey(cdnKey);

      await uploadFileToCdnWithProgress(presignedUrl, imageUri);

      const finalCdnUrl = cdnUrlFromBackend || `${CDN_BASE_URL}/${cdnKey}`;
      setCdnImageUrl(finalCdnUrl);
      setImageUploadCompleted(true);
      showToast("Image uploaded", "success");
    } catch (error) {
      console.log("requestPresignedUrlAndUpload error:", error);
      setImageUploadErrorMessage(error.message || "Image upload failed");
      showToast(error.message || "Image upload failed", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uploadFileToCdnWithProgress = async (uploadUrl, fileUri) => {
    return new Promise(async (resolve, reject) => {
      try {
        const fileResponse = await fetch(fileUri);
        const fileBlob = await fileResponse.blob();
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);

        // optional: xhr.setRequestHeader("Content-Type", fileBlob.type || "application/octet-stream");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setImageUploadProgressPercent(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setImageUploadProgressPercent(100);
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Upload network error"));

        xhr.send(fileBlob);
      } catch (error) {
        reject(error);
      }
    });
  };

  // --------------- markdown editor helpers ---------------
  const insertMarkdownAroundSelection = (syntaxBefore, syntaxAfter = syntaxBefore) => {
    // For simplicity we append syntax at cursor end (implementing selection-aware insert is more involved)
    setMarkdownBody((prev) => `${prev}${syntaxBefore}${syntaxAfter}`);
    // focus (best-effort)
    if (markdownInputRef.current && markdownInputRef.current.focus) {
      markdownInputRef.current.focus();
    }
  };

  const handleToggleFullscreenEditor = () => {
    setIsEditorFullscreen((prev) => !prev);
  };

  // --------------- flow control ---------------
  const canProceedToPreview = () => {
    if (!titleText.trim() || !markdownBody.trim() || !selectedCategory) return false;
    if (localImageUri && !imageUploadCompleted) return false;
    return true;
  };

  const goToPreview = () => {
    if (!canProceedToPreview()) {
      showToast("Complete required fields and wait for image upload", "error");
      return;
    }
    setCurrentStep(2);
  };

  const goBackToEdit = () => setCurrentStep(1);

  // --------------- submit blog ---------------
  const submitBlog = async () => {
    if (!canProceedToPreview()) {
      showToast("Please complete required fields", "error");
      return;
    }

    if (cdnImageUrl && !cdnImageUrl.startsWith(CDN_BASE_URL)) {
      showToast("Invalid image URL", "error");
      return;
    }

    try {
      const payload = {
        title: titleText,
        body: markdownBody,
        category: selectedCategory,
        publishedAt: new Date(publishDate),
        cdnImageUrl: cdnImageUrl || null,
        author: authorName || undefined,
      };

      const response = await secureFetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.json().catch(() => ({}));
      if (response.ok) {
        showToast(responseBody.message || "Blog created", "success");
        // reset form
        setTitleText("");
        setMarkdownBody("");
        setSelectedCategory(null);
        setPublishDate(new Date());
        setLocalImageUri(null);
        setPresignedUploadUrl(null);
        setPresignedCdnKey(null);
        setCdnImageUrl(null);
        setImageUploadCompleted(false);
        setImageUploadProgressPercent(0);
        setCurrentStep(1);
      } else {
        showToast(responseBody.message || "Failed to create blog", "error");
      }
    } catch (error) {
      console.log("submitBlog error:", error);
      showToast("Server error", "error");
    }
  };

  // small helper for preview truncation
  const truncatePreview = (text, n = 180) =>
    text ? (text.length > n ? text.substring(0, n - 1) + "…" : text) : "";

  // --------------- UI ---------------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={88}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Post</Text>
            <Text style={styles.headerSubtitle}>Write something people will love</Text>
          </View>

          {/* step indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepCircle, currentStep === 1 && styles.stepActive]}>
              <Text style={styles.stepCircleText}>1</Text>
            </View>
            <View style={styles.stepDivider} />
            <View style={[styles.stepCircle, currentStep === 2 && styles.stepActive]}>
              <Text style={styles.stepCircleText}>2</Text>
            </View>
          </View>

          {currentStep === 1 ? (
            // ---------- EDIT FORM ----------
            <View style={styles.card}>
              {/* Author (distinct, non-editable) */}
              <Text style={styles.fieldLabel}>Author</Text>
              <View style={styles.authorRow}>
                <View style={styles.authorBadge}>
                  <Text style={styles.authorBadgeText}>
                    {authorName ? authorName.charAt(0).toUpperCase() : "G"}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.authorNameText}>{authorName || "Guest"}</Text>
                  <Text style={styles.authorHint}>Author comes from your account — not editable</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Give your post a memorable title"
                placeholderTextColor="#9a9a9a"
                value={titleText}
                onChangeText={setTitleText}
              />

              {/* Markdown editor mini */}
              <Text style={styles.fieldLabel}>Body (Markdown supported)</Text>

              <View style={styles.editorToolbar}>
                <TouchableOpacity
                  style={styles.toolbarButton}
                  onPress={() => insertMarkdownAroundSelection("**", "**")}
                >
                  <Text style={styles.toolbarButtonText}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toolbarButton}
                  onPress={() => insertMarkdownAroundSelection("_", "_")}
                >
                  <Text style={styles.toolbarButtonText}>i</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toolbarButton}
                  onPress={() => insertMarkdownAroundSelection("\n# ", "\n")}
                >
                  <Text style={styles.toolbarButtonText}>H1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.toolbarButton}
                  onPress={() => insertMarkdownAroundSelection("\n[link text](https://)", "")}
                >
                  <Text style={styles.toolbarButtonText}>Link</Text>
                </TouchableOpacity>

                <View style={{ flex: 1 }} />

                <TouchableOpacity style={styles.fullscreenBtn} onPress={handleToggleFullscreenEditor}>
                  <Text style={styles.fullscreenBtnText}>Fullscreen</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                ref={markdownInputRef}
                style={[styles.input, styles.editorBox]}
                placeholder="Write your post in Markdown. Use **bold**, _italic_, [link](https://)..."
                placeholderTextColor="#9a9a9a"
                value={markdownBody}
                onChangeText={setMarkdownBody}
                multiline
              />

              {/* category & date */}
              <View style={{ flexDirection: "row", marginTop: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <RNPickerSelect
                    onValueChange={(v) => setSelectedCategory(v)}
                    items={categories}
                    placeholder={{ label: "Choose category", value: null }}
                    value={selectedCategory}
                    style={{
                      inputIOS: styles.input,
                      inputAndroid: styles.input,
                      placeholder: { color: "#9a9a9a" },
                    }}
                  />
                </View>

                <View style={{ width: 130 }}>
                  <Text style={styles.fieldLabel}>Publish</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowPublishDatePicker(true)}
                  >
                    <Text style={styles.datePickerText}>{publishDate.toDateString()}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {showPublishDatePicker && (
                <DateTimePicker
                  value={publishDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowPublishDatePicker(false);
                    if (selectedDate) setPublishDate(selectedDate);
                  }}
                />
              )}

              {/* image uploader */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Cover image (optional)</Text>
              <View style={styles.imageRow}>
                {localImageUri ? (
                  <Image source={{ uri: localImageUri }} style={styles.coverPreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={{ color: "#777" }}>No image</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <TouchableOpacity
                    style={[styles.uploadButton, isUploadingImage && styles.disabledButton]}
                    onPress={handlePickImage}
                    disabled={isUploadingImage}
                  >
                    <Text style={styles.uploadButtonText}>{localImageUri ? "Change" : "Select image"}</Text>
                  </TouchableOpacity>

                  {isUploadingImage ? (
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${imageUploadProgressPercent}%` }]} />
                      </View>
                      <Text style={{ color: "#aaa", marginTop: 6 }}>Uploading {imageUploadProgressPercent}%</Text>
                    </View>
                  ) : imageUploadCompleted ? (
                    <Text style={{ color: "#2ecc71", marginTop: 8 }}>Image uploaded ✓</Text>
                  ) : imageUploadErrorMessage ? (
                    <Text style={{ color: "#e74c3c", marginTop: 8 }}>{imageUploadErrorMessage}</Text>
                  ) : null}
                </View>
              </View>

              {/* controls */}
              <View style={styles.rowBetween}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginRight: 8 }]}
                  onPress={() => {
                    // reset only form fields (keeps author)
                    setTitleText("");
                    setMarkdownBody("");
                    setSelectedCategory(null);
                    setPublishDate(new Date());
                    setLocalImageUri(null);
                    setPresignedUploadUrl(null);
                    setPresignedCdnKey(null);
                    setCdnImageUrl(null);
                    setImageUploadCompleted(false);
                    setImageUploadProgressPercent(0);
                  }}
                >
                  <Text style={styles.secondaryText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, !canProceedToPreview() && styles.disabledButton]}
                  onPress={goToPreview}
                  disabled={!canProceedToPreview()}
                >
                  <Text style={styles.primaryText}>Next: Preview</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ---------- PREVIEW ----------
            <View style={styles.card}>
              <Text style={styles.previewHeading}>Preview</Text>

              <View style={styles.previewCard}>
                {cdnImageUrl ? (
                  <Image source={{ uri: cdnImageUrl }} style={styles.previewImageFull} />
                ) : localImageUri ? (
                  <Image source={{ uri: localImageUri }} style={styles.previewImageFull} />
                ) : (
                  <View style={[styles.previewImageFull, styles.imagePlaceholder, { justifyContent: "center" }]}>
                    <Text style={{ color: "#777" }}>No image</Text>
                  </View>
                )}

                <Text style={styles.previewTitle}>{titleText || "Untitled"}</Text>
                <Text style={styles.previewAuthor}>by {authorName || "Guest"}</Text>

                <View style={{ marginTop: 8 }}>
                  <Markdown style={markdownStyles}>
                    {markdownBody || "_No content yet_"}
                  </Markdown>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>Category: {selectedCategory || "—"}</Text>
                  <Text style={styles.metaText}>{publishDate.toDateString()}</Text>
                </View>
              </View>

              <View style={styles.rowBetween}>
                <TouchableOpacity style={styles.secondaryButton} onPress={goBackToEdit}>
                  <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryButton, (isUploadingImage || (localImageUri && !imageUploadCompleted)) && styles.disabledButton]}
                  onPress={submitBlog}
                  disabled={isUploadingImage || (localImageUri && !imageUploadCompleted)}
                >
                  {isUploadingImage ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryText}>Create Post</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        <BottomBar />

        {/* toast */}
        {alertMessage.length > 0 && (
          <Animated.View style={[styles.toast, { opacity: alertAnimation, backgroundColor: alertType === "success" ? "#2ecc71" : "#e74c3c" }]}>
            <Text style={styles.toastText}>{alertMessage}</Text>
          </Animated.View>
        )}

        {/* fullscreen editor modal */}
        <Modal visible={isEditorFullscreen} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 }}>
              <TouchableOpacity onPress={() => setIsEditorFullscreen(false)} style={{ padding: 8 }}>
                <Text style={{ color: "#fff" }}>Close</Text>
              </TouchableOpacity>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Editor (Markdown)</Text>
              <TouchableOpacity onPress={() => setIsEditorFullscreen(false)} style={{ padding: 8 }}>
                <Text style={{ color: "#2ecc71", fontWeight: "700" }}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 12, flex: 1 }}>
              <TextInput
                ref={markdownInputRef}
                value={markdownBody}
                onChangeText={setMarkdownBody}
                multiline
                autoFocus
                style={{ flex: 1, color: "#fff", textAlignVertical: "top", fontSize: 16, backgroundColor: "#080808", padding: 12, borderRadius: 8 }}
                placeholder="Write your post in Markdown..."
                placeholderTextColor="#7a7a7a"
              />
            </View>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 18,
    backgroundColor: "#0a0a0a",
  },
  header: {
    marginBottom: 10,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSubtitle: { color: "#9a9a9a", marginTop: 4 },
  stepIndicator: { flexDirection: "row", alignItems: "center", marginVertical: 12 },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  stepActive: { backgroundColor: "#2ecc71" },
  stepCircleText: { color: "#fff", fontWeight: "700" },
  stepDivider: { height: 3, width: 42, backgroundColor: "#222", marginHorizontal: 10, borderRadius: 2 },

  card: {
    backgroundColor: "#071012",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#0f1113",
    marginBottom: 14,
  },

  fieldLabel: { color: "#bdbdbd", fontSize: 13, marginBottom: 8 },

  authorRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  authorBadge: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#2ecc71", alignItems: "center", justifyContent: "center" },
  authorBadgeText: { color: "#000", fontWeight: "800", fontSize: 18 },
  authorNameText: { color: "#fff", fontWeight: "700" },
  authorHint: { color: "#9a9a9a", fontSize: 12 },

  input: {
    backgroundColor: "#081014",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#0e1112",
  },

  editorToolbar: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  toolbarButton: { backgroundColor: "#0d1112", padding: 8, borderRadius: 8, marginRight: 8 },
  toolbarButtonText: { color: "#fff", fontWeight: "700" },
  fullscreenBtn: { padding: 8 },
  fullscreenBtnText: { color: "#2ecc71", fontWeight: "700" },

  editorBox: { minHeight: 140, maxHeight: 260, marginTop: 6 },

  datePickerButton: { backgroundColor: "#081014", borderRadius: 10, padding: 10, alignItems: "center" },
  datePickerText: { color: "#fff" },

  imageRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  imagePlaceholder: {
    width: 120,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#071218",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#162022",
    justifyContent: "center",
    alignItems: "center",
  },
  coverPreview: { width: 120, height: 90, borderRadius: 10, backgroundColor: "#111" },

  uploadButton: { backgroundColor: "#122023", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignItems: "center" },
  uploadButtonText: { color: "#fff", fontWeight: "700" },

  progressBarBackground: { height: 6, backgroundColor: "#061012", borderRadius: 6, overflow: "hidden", marginTop: 8 },
  progressBarFill: { height: 6, backgroundColor: "#2ecc71", width: "0%" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },

  primaryButton: { backgroundColor: "#2ecc71", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, minWidth: 140, alignItems: "center" },
  primaryText: { color: "#000", fontWeight: "800" },

  secondaryButton: { backgroundColor: "#071014", borderColor: "#111", borderWidth: 1, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, alignItems: "center" },
  secondaryText: { color: "#fff", fontWeight: "700" },

  disabledButton: { opacity: 0.5 },

  previewHeading: { color: "#fff", fontWeight: "800", marginBottom: 8 },
  previewCard: { padding: 12, backgroundColor: "#061014", borderRadius: 10 },

  previewImageFull: { width: "100%", height: 200, borderRadius: 10, backgroundColor: "#111", marginBottom: 12 },
  previewTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  previewAuthor: { color: "#aab4b9", marginTop: 6 },

  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  metaText: { color: "#9aa0a6" },

  toast: { position: "absolute", bottom: 80, left: 18, right: 18, padding: 12, borderRadius: 10, alignItems: "center", zIndex: 999 },
  toastText: { color: "#000", fontWeight: "700" },
});

/* ---------- markdown style overrides for react-native-markdown-display ---------- */
const markdownStyles = {
  body: { color: "#e6eef2", fontSize: 15, lineHeight: 22 },
  heading1: { color: "#fff", fontSize: 20 },
  link: { color: "#7bd389" },
};
