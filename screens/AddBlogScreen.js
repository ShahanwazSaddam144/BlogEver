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
import { Ionicons } from "@expo/vector-icons"; // Ensure you have @expo/vector-icons installed
import BottomBar from "../components/BottomBar";
import { secureFetch } from "api/apiClient";
import * as SecureStore from "expo-secure-store";
import Markdown from "react-native-markdown-display";

const CDN_BASE_URL = "https://cdn.example.com";
const SCREEN_HEIGHT = Dimensions.get("window").height;

// --- Theme Constants ---
const COLORS = {
  bg: "#111827", // Dark Slate
  card: "#1F2937", // Lighter Slate
  input: "#374151", // Input BG
  text: "#F9FAFB", // White-ish
  muted: "#9CA3AF", // Grey text
  primary: "#10B981", // Emerald Green
  danger: "#EF4444",
  border: "#374151",
};

// --- Reusable Toolbar Component ---
const MarkdownToolbar = ({ onInsert, onToggleFullscreen, isFullscreen }) => {
  const tools = [
    { label: "B", value: "**", endValue: "**", icon: "bold" },
    { label: "I", value: "_", endValue: "_", icon: "italic" },
    { label: "H1", value: "\n# ", endValue: "", icon: "text" },
    { label: "H2", value: "\n## ", endValue: "", icon: "text" },
   { label: "Link", icon: "link", value: "[url text", endValue: "](https://)" },
    { label: "Code", value: "`", endValue: "`", icon: "code-slash" },
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
            {/* Using text labels for simplicity, swap with Icons if preferred */}
            <Text style={styles.toolBtnText}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fullscreenBtn} onPress={onToggleFullscreen}>
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
  // --------------- form state ---------------
  const [authorName, setAuthorName] = useState("");
  const [titleText, setTitleText] = useState("");
  const [markdownBody, setMarkdownBody] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [publishDate, setPublishDate] = useState(new Date());
  const [showPublishDatePicker, setShowPublishDatePicker] = useState(false);

  // --------------- image state ---------------
  const [localImageUri, setLocalImageUri] = useState(null);
  const [cdnImageUrl, setCdnImageUrl] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgressPercent, setImageUploadProgressPercent] = useState(0);
  const [imageUploadCompleted, setImageUploadCompleted] = useState(false);

  // --------------- UI state ---------------
  const [currentStep, setCurrentStep] = useState(1);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const alertAnimation = useRef(new Animated.Value(0)).current;

  // Editor refs
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
        const userJson = await SecureStore.getItemAsync("user");
        if (userJson) {
          const userObj = JSON.parse(userJson);
          setAuthorName(userObj.name || "");
        }
      } catch (e) {}
    })();
  }, []);

  // --------------- Toast ---------------
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

  // --------------- Image Handling ---------------
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Allow access to photos to upload a cover.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLocalImageUri(result.assets[0].uri);
        await requestPresignedUrlAndUpload(result.assets[0].uri);
      }
    } catch (error) {
      showToast("Could not select image", "error");
    }
  };

  const requestPresignedUrlAndUpload = async (imageUri) => {
    setIsUploadingImage(true);
    setImageUploadProgressPercent(0);
    setImageUploadCompleted(false);

    try {
      const tokenResponse = await secureFetch("/api/upload-token", { method: "GET" });
      if (!tokenResponse.ok) throw new Error("Failed to get upload token");
      
      const { uploadUrl, cdnKey } = await tokenResponse.json();
      await uploadFileToCdnWithProgress(uploadUrl, imageUri);

      setCdnImageUrl(`${CDN_BASE_URL}/${cdnKey}`);
      setImageUploadCompleted(true);
      showToast("Image uploaded successfully", "success");
    } catch (error) {
      showToast("Image upload failed", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uploadFileToCdnWithProgress = (uploadUrl, fileUri) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setImageUploadProgressPercent(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject());
        xhr.onerror = () => reject();
        xhr.send(blob);
      } catch (e) {
        reject(e);
      }
    });
  };

  // --------------- Markdown Logic ---------------
  const insertMarkdown = (syntaxStart, syntaxEnd) => {
    setMarkdownBody((prev) => `${prev}${syntaxStart}${syntaxEnd}`);
  };

  const toggleFullscreen = () => {
    setIsEditorFullscreen(!isEditorFullscreen);
  };

  // --------------- Submission ---------------
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
        // Reset form
        setTitleText("");
        setMarkdownBody("");
        setLocalImageUri(null);
        setCdnImageUrl(null);
        setCurrentStep(1);
      } else {
        showToast("Failed to publish blog", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    }
  };

  const canProceed = titleText && markdownBody && selectedCategory && (!localImageUri || imageUploadCompleted);

  // --------------- Render Helpers ---------------
  const renderStep1 = () => (
    <View style={styles.card}>
      {/* Title */}
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={[styles.input, styles.titleInput]}
        placeholder="Enter an engaging title..."
        placeholderTextColor={COLORS.muted}
        value={titleText}
        onChangeText={setTitleText}
      />

      {/* Category & Date */}
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

      {/* Editor Section */}
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

      {/* Image Uploader */}
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
          <View style={[styles.progressBar, { width: `${imageUploadProgressPercent}%` }]} />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.footerButtons}>
        <TouchableOpacity style={styles.resetBtn} onPress={() => setTitleText("")}>
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
        source={{ uri: cdnImageUrl || localImageUri || "https://via.placeholder.com/400" }}
        style={styles.previewCover}
      />
      
      <View style={styles.previewContent}>
        <Text style={styles.previewTitle}>{titleText}</Text>
        <View style={styles.previewMeta}>
          <Text style={styles.previewAuthor}>{authorName || "Guest Author"}</Text>
          <Text style={styles.previewDate}>• {publishDate.toDateString()}</Text>
        </View>
        
        <View style={styles.markdownWrapper}>
          <Markdown style={markdownStyles}>{markdownBody}</Markdown>
        </View>
      </View>

      <View style={styles.footerButtons}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentStep(1)}>
          <Ionicons name="arrow-back" size={16} color={COLORS.text} />
          <Text style={styles.backBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={submitBlog}
        >
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
          {/* Stepper */}
          <View style={styles.stepper}>
            <View style={[styles.stepDot, currentStep >= 1 && styles.stepActive]} />
            <View style={[styles.stepLine, currentStep === 2 && styles.stepActive]} />
            <View style={[styles.stepDot, currentStep === 2 && styles.stepActive]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {currentStep === 1 ? renderStep1() : renderStep2()}
        </ScrollView>

        <BottomBar />

        {/* Toast Notification */}
        {alertMessage ? (
          <Animated.View style={[styles.toast, { opacity: alertAnimation, backgroundColor: alertType === "success" ? COLORS.primary : COLORS.danger }]}>
            <Text style={styles.toastText}>{alertMessage}</Text>
          </Animated.View>
        ) : null}

        {/* Fullscreen Editor Modal */}
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
              {/* Toolbar inside KeyboardAvoidingView to stay above keyboard */}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  // Header
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
  headerTitle: { fontSize: 24, fontWeight: "800", color: COLORS.text, letterSpacing: 0.5 },
  stepper: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.input },
  stepLine: { width: 30, height: 2, backgroundColor: COLORS.input, marginHorizontal: 4 },
  stepActive: { backgroundColor: COLORS.primary },

  // Card
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
  label: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" },
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
  
  // Picker & Date
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

  // Editor
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

  // Toolbar
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

  // Image Upload
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
  progressContainer: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressBar: { height: "100%", backgroundColor: COLORS.primary },

  // Footer Buttons
  footerButtons: { flexDirection: "row", marginTop: 24, justifyContent: "flex-end", alignItems: "center" },
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

  // Preview Styles
  previewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  previewLabel: { color: COLORS.primary, fontWeight: "bold", letterSpacing: 1 },
  previewCover: { width: "100%", height: 200, borderRadius: 12, marginBottom: 16 },
  previewContent: { paddingHorizontal: 4 },
  previewTitle: { color: COLORS.text, fontSize: 26, fontWeight: "bold", marginBottom: 8 },
  previewMeta: { flexDirection: "row", marginBottom: 16 },
  previewAuthor: { color: COLORS.primary, fontWeight: "600", marginRight: 6 },
  previewDate: { color: COLORS.muted },
  markdownWrapper: { marginTop: 10 },
  
  backBtn: { flexDirection: "row", alignItems: "center", marginRight: 16, backgroundColor: COLORS.input, padding: 10, borderRadius: 8 },
  backBtnText: { color: COLORS.text, fontWeight: "600", marginLeft: 6 },
  publishBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  publishBtnText: { color: "#000", fontWeight: "800" },

  // Fullscreen Modal
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
    borderTopColor: COLORS.border 
  },

  // Toast
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

// --- Markdown Renderer Styles ---
const markdownStyles = StyleSheet.create({
  body: { color: "#D1D5DB", fontSize: 16, lineHeight: 24 },
  heading1: { color: COLORS.text, fontSize: 24, marginTop: 20, marginBottom: 10, fontWeight: "bold" },
  heading2: { color: COLORS.text, fontSize: 20, marginTop: 16, marginBottom: 8, fontWeight: "bold" },
  link: { color: COLORS.primary, textDecorationLine: "underline" },
  code_inline: { backgroundColor: "#111827", color: "#F472B6", borderRadius: 4, paddingHorizontal: 4 },
  code_block: { backgroundColor: "#111827", padding: 10, borderRadius: 8, marginVertical: 8, borderWidth: 1, borderColor: "#374151" },
  blockquote: { borderLeftWidth: 4, borderLeftColor: COLORS.primary, paddingLeft: 10, marginVertical: 8, fontStyle: "italic", color: COLORS.muted },
});