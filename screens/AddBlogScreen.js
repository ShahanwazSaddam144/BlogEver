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
  SafeAreaView,
  Modal,
  StatusBar,
  Dimensions,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import RNPickerSelect from "react-native-picker-select";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import BottomBar from "../components/BottomBar";
import { secureFetch } from "api/apiClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Markdown from "react-native-markdown-display";
import * as FileSystem from "expo-file-system";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// --- Theme Constants ---
const COLORS = {
  bg: "#111827",
  card: "#1F2937",
  input: "#374151",
  text: "#F9FAFB",
  muted: "#9CA3AF",
  primary: "#10B981",
  danger: "#EF4444",
  border: "#374151",
};

const MarkdownToolbar = ({ onInsert, onToggleFullscreen, isFullscreen }) => {
  const tools = [
    { label: "B", value: "**", endValue: "**" },
    { label: "I", value: "_", endValue: "_" },
    { label: "H1", value: "\n# ", endValue: "" },
    { label: "H2", value: "\n## ", endValue: "" },
    { label: "Link", value: "[url text", endValue: "](https://)" },
    { label: "Code", value: "`", endValue: "`" },
  ];

  return (
    <View style={styles.toolbarContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tools.map((t, i) => (
          <TouchableOpacity
            key={i}
            style={styles.toolBtn}
            onPress={() => onInsert(t.value, t.endValue)}
          >
            <Text style={styles.toolBtnText}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.fullscreenBtn}
        onPress={onToggleFullscreen}
      >
        <Ionicons
          name={isFullscreen ? "contract" : "expand"}
          size={20}
          color={COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  );
};

export default function AddBlogScreen() {
  // form state
  const [authorName, setAuthorName] = useState("");
  const [titleText, setTitleText] = useState("");
  const [markdownBody, setMarkdownBody] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [publishDate, setPublishDate] = useState(new Date());
  const [showPublishDatePicker, setShowPublishDatePicker] = useState(false);

  // image state
  const [localImageUri, setLocalImageUri] = useState(null);
  const [cdnImageUrl, setCdnImageUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgressPercent, setImageUploadProgressPercent] =
    useState(0);
  const [imageUploadCompleted, setImageUploadCompleted] = useState(false);

  // UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const alertAnimation = useRef(new Animated.Value(0)).current;

  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const markdownInputRef = useRef(null);
  const modalInputRef = useRef(null);

  const categories = [
    { label: "Coding", value: "Coding" },
    { label: "Entertainment", value: "Entertainment" },
    { label: "Lifestyle", value: "Lifestyle" },
    { label: "Travel", value: "Travel" },
  ];

  useEffect(() => {
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem("user");
        if (userJson) {
          const userObj = JSON.parse(userJson);
          setAuthorName(userObj.name || "");
        }
      } catch (e) {}
    })();
  }, []);

  const showToast = (message, type = "success") => {
    setAlertMessage(message);
    setAlertType(type);
    Animated.timing(alertAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(alertAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 2500);
    });
  };

  // helpers
  const getMimeFromFilename = (filename) => {
    const ext = (filename || "").split(".").pop().toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      case "heic":
        return "image/heic";
      case "heif":
        return "image/heif";
      default:
        return "application/octet-stream";
    }
  };

  // This attempts to fetch blob (works often). If it fails (Android content://), fallback to reading base64 via expo-file-system and creating a blob.
  const getBlobFromUri = async (uri) => {
    try {
      const fetched = await fetch(uri);
      const blob = await fetched.blob();
      return blob;
    } catch (err) {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        let filename = uri.split("/").pop() || `file-${Date.now()}`;
        filename = filename.split("?")[0];
        const mime = getMimeFromFilename(filename);
        const dataUrl = `data:${mime};base64,${base64}`;
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        return blob;
      } catch (e) {
        console.error("getBlobFromUri fallback failed", e);
        throw e;
      }
    }
  };

  // Image handling
  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Allow access to photos to upload a cover.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setLocalImageUri(uri);
        await requestPresignedUrlAndUpload(uri);
      }
    } catch (error) {
      console.error("handlePickImage error:", error);
      showToast("Could not select image", "error");
    }
  };

  // --- NEW: request signed signature from backend and upload to Cloudinary ---
  const requestPresignedUrlAndUpload = async (imageUri) => {
    setIsUploadingImage(true);
    setImageUploadProgressPercent(0);
    setImageUploadCompleted(false);

    try {
      // derive filename
      let fileName = imageUri.split("/").pop() || `upload-${Date.now()}`;
      fileName = fileName.split("?")[0];

      // try to get blob to determine MIME & size (not strictly required for Cloudinary, but useful)
      let blob;
      try {
        blob = await getBlobFromUri(imageUri);
      } catch (e) {
        console.warn("Could not create blob; proceeding with guessed mime");
      }

      const fileType = (blob && blob.type) || getMimeFromFilename(fileName);

      // 1) Ask your backend serverless signing route for signature
      // Using secureFetch so it uses API_BASE_URL and auth if needed
      const sigRes = await secureFetch("/api/cloudinary/sign", {
        method: "GET",
      });
      if (!sigRes.ok) {
        let txt = "";
        try {
          txt = await sigRes.text();
        } catch (_) {}
        throw new Error("Failed to get Cloudinary signature: " + txt);
      }
      const { apiKey, cloudName, timestamp, signature, folder } =
        await sigRes.json();

      if (!cloudName || !apiKey || !signature) {
        throw new Error("Invalid signature response from server");
      }

      // 2) Build FormData
      const formData = new FormData();
      // In React Native + Expo, file object should be { uri, type, name }
      formData.append("file", {
        uri: imageUri,
        type: fileType,
        name: fileName,
      });
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      if (folder) formData.append("folder", folder);
      // optional: transformations or eager params can be appended here

      // 3) Upload directly to Cloudinary using XHR to get progress
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      await uploadFormDataWithProgress(uploadUrl, formData);

      // 4) After successful upload, Cloudinary will return JSON with secure_url.
      // The uploadFormDataWithProgress returns the parsed json result:
      // we set cdnImageUrl inside that function's return
      setImageUploadCompleted(true);
      showToast("Image uploaded successfully", "success");
    } catch (error) {
      console.error("requestPresignedUrlAndUpload error:", error);
      showToast("Image upload failed", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // upload with progress via XHR and parse response
  const uploadFormDataWithProgress = (uploadUrl, formData) => {
    return new Promise((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", uploadUrl);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setImageUploadProgressPercent(
              Math.round((e.loaded / e.total) * 100),
            );
          }
        };

        xhr.onload = () => {
          try {
            const text = xhr.responseText;
            const json = text ? JSON.parse(text) : null;
            if (xhr.status >= 200 && xhr.status < 300 && json) {
              // Cloudinary returns secure_url and public_id etc.
              if (json.secure_url) {
                setCdnImageUrl(json.secure_url);
                resolve(json);
                return;
              } else {
                console.error("Cloudinary response missing secure_url:", json);
                reject(
                  new Error("Upload succeeded but no secure_url returned"),
                );
                return;
              }
            } else {
              console.error("Upload failed:", xhr.status, xhr.responseText);
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          } catch (err) {
            console.error(
              "Failed to parse upload response:",
              err,
              xhr.responseText,
            );
            reject(err);
          }
        };

        xhr.onerror = () => {
          console.error("Upload XHR error");
          reject(new Error("Upload network error"));
        };

        // In RN, FormData can be passed directly to xhr.send
        xhr.send(formData);
      } catch (e) {
        reject(e);
      }
    });
  };

  // rest of your screen unchanged (insertMarkdown, toggleFullscreen, submitBlog, UI rendering etc.)
  const insertMarkdown = (syntaxStart, syntaxEnd) => {
    setMarkdownBody((prev) => `${prev}${syntaxStart}${syntaxEnd}`);
  };

  const toggleFullscreen = () => setIsEditorFullscreen(!isEditorFullscreen);

  const submitBlog = async () => {
    try {
      const payload = {
        title: titleText,
        body: markdownBody,
        category: selectedCategory,
        publishedAt: publishDate,
        cdnImageUrl,
        author: authorName,
      };

      const res = await secureFetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Blog published successfully!", "success");
        setTitleText("");
        setMarkdownBody("");
        setLocalImageUri(null);
        setCdnImageUrl(null);
        setCurrentStep(1);
      } else {
        showToast("Failed to publish blog", "error");
      }
    } catch (e) {
      console.error("submitBlog error:", e);
      showToast("Network error", "error");
    }
  };

  const canProceed =
    titleText &&
    markdownBody &&
    selectedCategory &&
    (!localImageUri || imageUploadCompleted);

  // Rendering code unchanged from your original screen (I omitted it here for brevity in this block)
  // ... (Use your existing renderStep1/renderStep2 UI code; it will work with the new upload flow)

  // For brevity, reuse the render functions/styles from your original file below
  // (paste the same renderStep1/renderStep2 and return JSX as before)
  // ------------------------------
  // (The rest of the file — UI & styles — remains exactly the same as in your original file.)
  // Paste your existing renderStep1, renderStep2 and return statement here.
  // ------------------------------

  // I'll reuse the same renderStep1/renderStep2 from your previous file:
  const renderStep1 = () => (
    <View style={styles.card}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={[styles.input, styles.titleInput]}
        placeholder="Enter an engaging title..."
        placeholderTextColor={COLORS.muted}
        value={titleText}
        onChangeText={setTitleText}
      />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              onValueChange={setSelectedCategory}
              items={categories}
              placeholder={{ label: "Select...", value: null }}
              value={selectedCategory}
              style={{
                inputIOS: styles.pickerText,
                inputAndroid: styles.pickerText,
                placeholder: { color: COLORS.muted },
              }}
            />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Publish Date</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowPublishDatePicker(true)}
          >
            <Text style={styles.dateBtnText}>{publishDate.toDateString()}</Text>
            <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {showPublishDatePicker && (
        <DateTimePicker
          value={publishDate}
          mode="date"
          onChange={(e, date) => {
            setShowPublishDatePicker(false);
            if (date) setPublishDate(date);
          }}
        />
      )}

      <Text style={[styles.label, { marginTop: 16 }]}>Content</Text>
      <View style={styles.editorContainer}>
        <MarkdownToolbar
          onInsert={insertMarkdown}
          onToggleFullscreen={toggleFullscreen}
          isFullscreen={false}
        />
        <TextInput
          ref={markdownInputRef}
          style={styles.editorInput}
          placeholder="Start writing your story..."
          placeholderTextColor={COLORS.muted}
          value={markdownBody}
          onChangeText={setMarkdownBody}
          multiline
        />
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>Cover Image</Text>
      <TouchableOpacity onPress={handlePickImage} style={styles.uploadArea}>
        {localImageUri ? (
          <Image source={{ uri: localImageUri }} style={styles.uploadedImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="image-outline" size={32} color={COLORS.muted} />
            <Text style={styles.uploadText}>Tap to select image</Text>
          </View>
        )}
      </TouchableOpacity>

      {isUploadingImage && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${imageUploadProgressPercent}%` },
            ]}
          />
        </View>
      )}

      <View style={styles.footerButtons}>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => setTitleText("")}
        >
          <Text style={styles.resetBtnText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed && styles.disabledBtn]}
          disabled={!canProceed}
          onPress={() => setCurrentStep(2)}
        >
          <Text style={styles.nextBtnText}>Next: Preview</Text>
          <Ionicons name="arrow-forward" size={16} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.card}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewLabel}>PREVIEW MODE</Text>
        <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
      </View>

      <Image
        source={{
          uri:
            cdnImageUrl || localImageUri || "https://via.placeholder.com/400",
        }}
        style={styles.previewCover}
      />

      <View style={styles.previewContent}>
        <Text style={styles.previewTitle}>{titleText}</Text>
        <View style={styles.previewMeta}>
          <Text style={styles.previewAuthor}>
            {authorName || "Guest Author"}
          </Text>
          <Text style={styles.previewDate}>• {publishDate.toDateString()}</Text>
        </View>

        <View style={styles.markdownWrapper}>
          <Markdown style={markdownStyles}>{markdownBody}</Markdown>
        </View>
      </View>

      <View style={styles.footerButtons}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setCurrentStep(1)}
        >
          <Ionicons name="arrow-back" size={16} color={COLORS.text} />
          <Text style={styles.backBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.publishBtn} onPress={submitBlog}>
          {isUploadingImage ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.publishBtnText}>Publish Now</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Post</Text>
          <View style={styles.stepper}>
            <View
              style={[styles.stepDot, currentStep >= 1 && styles.stepActive]}
            />
            <View
              style={[styles.stepLine, currentStep === 2 && styles.stepActive]}
            />
            <View
              style={[styles.stepDot, currentStep === 2 && styles.stepActive]}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {currentStep === 1 ? renderStep1() : renderStep2()}
        </ScrollView>

        <BottomBar />

        {alertMessage ? (
          <Animated.View
            style={[
              styles.toast,
              {
                opacity: alertAnimation,
                backgroundColor:
                  alertType === "success" ? COLORS.primary : COLORS.danger,
              },
            ]}
          >
            <Text style={styles.toastText}>{alertMessage}</Text>
          </Animated.View>
        ) : null}

        <Modal
          visible={isEditorFullscreen}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <SafeAreaView style={styles.fsContainer}>
            <View style={styles.fsHeader}>
              <TouchableOpacity onPress={toggleFullscreen}>
                <Text style={styles.fsClose}>Done</Text>
              </TouchableOpacity>
              <Text style={styles.fsTitle}>Editor</Text>
              <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <TextInput
                ref={modalInputRef}
                style={styles.fsInput}
                value={markdownBody}
                onChangeText={setMarkdownBody}
                multiline
                placeholder="Write your masterpiece..."
                placeholderTextColor={COLORS.muted}
                autoFocus={true}
              />
              <View style={styles.fsToolbarWrapper}>
                <MarkdownToolbar
                  onInsert={insertMarkdown}
                  onToggleFullscreen={toggleFullscreen}
                  isFullscreen={true}
                />
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles (identical to your original styles) ------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.card,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.input,
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: COLORS.input,
    marginHorizontal: 4,
  },
  stepActive: { backgroundColor: COLORS.primary },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  label: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  titleInput: { fontSize: 18, fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  pickerContainer: {
    backgroundColor: COLORS.input,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  pickerText: { color: COLORS.text, fontSize: 15 },
  dateBtn: {
    backgroundColor: COLORS.input,
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateBtnText: { color: COLORS.text, fontWeight: "500" },
  editorContainer: {
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
    backgroundColor: "#161f2e",
  },
  editorInput: {
    color: COLORS.text,
    padding: 12,
    minHeight: 180,
    textAlignVertical: "top",
    fontSize: 15,
    lineHeight: 22,
  },
  toolbarContainer: {
    flexDirection: "row",
    backgroundColor: "#252f3f",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toolBtn: {
    backgroundColor: COLORS.input,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  toolBtnText: { color: COLORS.primary, fontWeight: "bold", fontSize: 14 },
  fullscreenBtn: { padding: 6, marginLeft: "auto" },
  uploadArea: {
    height: 140,
    backgroundColor: COLORS.input,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  uploadPlaceholder: { alignItems: "center" },
  uploadText: { color: COLORS.muted, marginTop: 8 },
  uploadedImage: { width: "100%", height: "100%" },
  progressContainer: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: COLORS.primary },
  footerButtons: {
    flexDirection: "row",
    marginTop: 24,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  resetBtn: { marginRight: 16 },
  resetBtnText: { color: COLORS.muted },
  nextBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  nextBtnText: { color: "#000", fontWeight: "700", marginRight: 6 },
  disabledBtn: { opacity: 0.5 },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  previewLabel: { color: COLORS.primary, fontWeight: "bold", letterSpacing: 1 },
  previewCover: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  previewContent: { paddingHorizontal: 4 },
  previewTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  previewMeta: { flexDirection: "row", marginBottom: 16 },
  previewAuthor: { color: COLORS.primary, fontWeight: "600", marginRight: 6 },
  previewDate: { color: COLORS.muted },
  markdownWrapper: { marginTop: 10 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    backgroundColor: COLORS.input,
    padding: 10,
    borderRadius: 8,
  },
  backBtnText: { color: COLORS.text, fontWeight: "600", marginLeft: 6 },
  publishBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  publishBtnText: { color: "#000", fontWeight: "800" },
  fsContainer: { flex: 1, backgroundColor: COLORS.bg },
  fsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  fsClose: { color: COLORS.primary, fontSize: 16, fontWeight: "600" },
  fsTitle: { color: COLORS.text, fontSize: 16, fontWeight: "bold" },
  fsInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    padding: 16,
    textAlignVertical: "top",
    lineHeight: 24,
  },
  fsToolbarWrapper: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toast: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  toastText: { color: "#000", fontWeight: "700" },
});

const markdownStyles = StyleSheet.create({
  body: { color: "#D1D5DB", fontSize: 16, lineHeight: 24 },
  heading1: {
    color: COLORS.text,
    fontSize: 24,
    marginTop: 20,
    marginBottom: 10,
    fontWeight: "bold",
  },
  heading2: {
    color: COLORS.text,
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
    fontWeight: "bold",
  },
  link: { color: COLORS.primary, textDecorationLine: "underline" },
  code_inline: {
    backgroundColor: "#111827",
    color: "#F472B6",
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  code_block: {
    backgroundColor: "#111827",
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    paddingLeft: 10,
    marginVertical: 8,
    fontStyle: "italic",
    color: COLORS.muted,
  },
});
