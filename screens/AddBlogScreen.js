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
import * as FileSystem from "expo-file-system/legacy";

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

  // active image shown in preview (avoids swapping until CDN is ready)
  const [activeImageUri, setActiveImageUri] = useState(null);

  // Preview loading state (skeleton until preview image loads / cdn prefetch)
  const [isPreviewImageLoading, setIsPreviewImageLoading] = useState(false);
  const [isPrefetchingCdn, setIsPrefetchingCdn] = useState(false);

  // submission state (prevents double-submit)
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      default:
        return "image/jpeg"; // Default fallback
    }
  };

  // SKELETON animation refs
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const skeletonLoopRef = useRef(null);

  useEffect(() => {
    if (isUploadingImage || isPreviewImageLoading) {
      skeletonAnim.setValue(0);
      skeletonLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );
      skeletonLoopRef.current.start();
    } else {
      if (skeletonLoopRef.current) {
        skeletonLoopRef.current.stop();
        skeletonLoopRef.current = null;
      }
    }
    return () => {
      if (skeletonLoopRef.current) skeletonLoopRef.current.stop();
    };
  }, [isUploadingImage, isPreviewImageLoading, skeletonAnim]);

  // Keep activeImageUri in sync with localImageUri initially
  useEffect(() => {
    if (localImageUri) {
      setActiveImageUri(localImageUri);
    } else if (!cdnImageUrl) {
      setActiveImageUri(null);
    }
  }, [localImageUri, cdnImageUrl]);

  // When CDN URL becomes available: prefetch it and only swap after it's cached (prevents flicker)
  useEffect(() => {
    let cancelled = false;
    const switchToCdnSafely = async (url) => {
      if (!url) return;
      try {
        setIsPrefetchingCdn(true);
        setIsPreviewImageLoading(true);
        // prefetch returns a Promise<boolean>
        await Image.prefetch(url);
        if (cancelled) return;
        // now it's cached -> swap active image
        setActiveImageUri(url);
      } catch (e) {
        console.warn("CDN prefetch failed:", e);
        // keep activeImageUri as-is (likely local)
        showToast("Could not load CDN preview, using local image.", "error");
      } finally {
        if (!cancelled) {
          setIsPreviewImageLoading(false);
          setIsPrefetchingCdn(false);
        }
      }
    };

    if (cdnImageUrl) {
      switchToCdnSafely(cdnImageUrl);
    }

    return () => {
      cancelled = true;
    };
  }, [cdnImageUrl]);

  // Image handling
  const handlePickImage = async () => {
    if (isUploadingImage) return;

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
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setLocalImageUri(uri);
        setActiveImageUri(uri);

        // FIX: Ensure these are false so the skeleton doesn't flash
        setIsPreviewImageLoading(false);

        await requestPresignedUrlAndUpload(uri);
      }
    } catch (error) {
      console.error("handlePickImage error:", error);
      showToast("Could not select image", "error");
    }
  };

  // XHR upload helper for progress
  const uploadFormDataWithProgress = (uploadUrl, formData) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setImageUploadProgressPercent(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(json);
          } catch (e) {
            reject(new Error("Failed to parse response"));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));

      xhr.send(formData);
    });
  };

  // Request presigned and upload (handles web vs native)
  const requestPresignedUrlAndUpload = async (imageUri) => {
    // start upload, prevent duplicate uploads
    setIsUploadingImage(true);
    setImageUploadProgressPercent(0);
    setImageUploadCompleted(false);

    try {
      let fileToUpload;

      if (Platform.OS === "web") {
        // fetch blob and convert to File
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = (imageUri.split("/").pop() || "upload.jpg").split(
          "?",
        )[0];
        fileToUpload = new File([blob], filename, {
          type: blob.type || "image/jpeg",
        });
      } else {
        // mobile: read base64 and pass data URI to Cloudinary
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });
        fileToUpload = `data:${getMimeFromFilename(imageUri)};base64,${base64}`;
      }

      const sigRes = await secureFetch("/api/cloudinary/sign", {
        method: "GET",
      });
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const sigData = await sigRes.json();

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", String(sigData.timestamp));
      formData.append("signature", sigData.signature);
      if (sigData.folder) formData.append("folder", sigData.folder);
      formData.append("upload_preset", "BlogEver");

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`;

      // Use XHR helper for progress
      const cloudResp = await uploadFormDataWithProgress(uploadUrl, formData);

      if (cloudResp && cloudResp.secure_url) {
        setImageUploadCompleted(true);
        setCdnImageUrl(cloudResp.secure_url); // triggers prefetch and safe swap (see useEffect)
        showToast("Upload successful!", "success");
      } else {
        throw new Error(cloudResp?.error?.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      showToast(error.message || "Upload failed", "error");
      // If upload failed, keep local preview but mark preview load false to remove skeleton
      setIsPreviewImageLoading(false);
    } finally {
      setIsUploadingImage(false);
      // small delay to show 100% complete
      setTimeout(() => setImageUploadProgressPercent(0), 800);
    }
  };

  const insertMarkdown = (syntaxStart, syntaxEnd) => {
    setMarkdownBody((prev) => `${prev}${syntaxStart}${syntaxEnd}`);
  };

  const toggleFullscreen = () => setIsEditorFullscreen(!isEditorFullscreen);

  const submitBlog = async () => {
    // prevent double submit
    if (isSubmitting) return;
    if (!canProceed) {
      showToast("Complete required fields before publishing", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: titleText,
        body: markdownBody,
        category: selectedCategory,
        publishedAt: publishDate,
        cdnImageUrl,
        author: authorName,
      };

      const res = await secureFetch("/api/blogs/create-blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Blog published successfully!", "success");
        // Reset form
        setTitleText("");
        setMarkdownBody("");
        setLocalImageUri(null);
        setCdnImageUrl(null);
        setActiveImageUri(null);
        setCurrentStep(1);
        setImageUploadCompleted(false);
      } else {
        const errText = await res.text().catch(() => null);
        console.warn("publish error body:", errText);
        showToast("Failed to publish blog", "error");
      }
    } catch (e) {
      console.error("submitBlog error:", e);
      showToast("Network error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed =
    titleText &&
    markdownBody &&
    selectedCategory &&
    (!localImageUri || imageUploadCompleted);

  const renderUploadArea = () => {
    const pulse = skeletonAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.25, 0.6],
    });

    return (
      <TouchableOpacity
        onPress={handlePickImage}
        style={[
          styles.uploadArea,
          isUploadingImage ? { opacity: 0.85 } : undefined,
        ]}
        activeOpacity={0.9}
        disabled={isUploadingImage}
      >
        {localImageUri ? (
          <Image
            source={{ uri: localImageUri }}
            style={styles.uploadedImage}
            resizeMode="cover"
            // --- FIX: REMOVED onLoadStart and onLoadEnd ---
            // Local images load too fast; these callbacks cause the flicker.
            onError={() => {
              showToast("Failed to load selected image", "error");
            }}
          />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Ionicons name="image-outline" size={32} color={COLORS.muted} />
            <Text style={styles.uploadText}>Tap to select image</Text>
          </View>
        )}

        {/* SKELETON + PROGRESS OVERLAY */}
        {/* Only show skeleton if explicitly uploading or if CDN prefetch is happening */}
        {isUploadingImage && (
          <View style={styles.skeletonOverlay} pointerEvents="none">
            <Animated.View style={[styles.skeletonPulse, { opacity: pulse }]} />
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ marginTop: 10 }}
            />
            <Text style={styles.progressText}>
              Uploading... {imageUploadProgressPercent}%
            </Text>
          </View>
        )}

        {/* small progress bar under the upload area */}
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
      </TouchableOpacity>
    );
  };

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
      {renderUploadArea()}

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

      <View>
        <Image
          source={{
            uri:
              activeImageUri ||
              localImageUri ||
              "https://via.placeholder.com/400",
          }}
          style={styles.previewCover}
          resizeMode="cover"
        />
        {(isPreviewImageLoading || isPrefetchingCdn) && (
          <View style={styles.previewSkeletonOverlay} pointerEvents="none">
            <Animated.View
              style={[
                styles.previewSkeletonBar,
                {
                  opacity: skeletonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.25, 0.6],
                  }),
                },
              ]}
            />
            <Text style={[styles.progressText, { marginTop: 8 }]}>
              Loading high-res...
            </Text>
          </View>
        )}
      </View>

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
        <TouchableOpacity
          style={[
            styles.publishBtn,
            (isUploadingImage || isSubmitting) && styles.disabledBtn,
          ]}
          onPress={submitBlog}
          disabled={isUploadingImage || isSubmitting}
        >
          {isSubmitting ? (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000000" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#000000",
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
    backgroundColor: "#000000",
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
    height: 200,
    backgroundColor: COLORS.input,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    overflow: "hidden",
    marginBottom: 8,
  },
  uploadPlaceholder: { alignItems: "center" },
  uploadText: { color: COLORS.muted, marginTop: 8 },
  uploadedImage: { width: "100%", height: "100%" },

  // Skeleton overlay (added)
  skeletonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonPulse: {
    width: "70%",
    height: 12,
    backgroundColor: "#2b2b2b",
    borderRadius: 8,
    marginBottom: 8,
  },
  progressText: {
    color: "#fff",
    marginTop: 6,
    fontWeight: "700",
  },

  progressContainer: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
    width: "100%",
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
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#1F2937",
  },
  // overlay for preview skeleton
  previewSkeletonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewSkeletonBar: {
    width: "80%",
    height: 14,
    backgroundColor: "#2b2b2b",
    borderRadius: 8,
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
