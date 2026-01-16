import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import BottomBar from "../components/BottomBar";
import RNPickerSelect from "react-native-picker-select";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function AddBlogScreen() {
  const [createdby, setCreatedby] = useState(""); // author
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");
  const [publishedAt, setPublishedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Custom alert
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

  // Load logged-in username as author
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await AsyncStorage.getItem("user");
        if (user) {
          const parsedUser = JSON.parse(user);
          setCreatedby(parsedUser.name || "Guest");
        }
      } catch (err) {
        console.log("Error fetching user:", err);
      }
    };
    fetchUser();
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

  const handleSubmit = async () => {
    if (!createdby || !name || !desc || !category || !publishedAt) {
      showAlert("Please fill all fields", "error");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        showAlert("You are not logged in", "error");
        return;
      }

      const res = await fetch("http://192.168.100.77:5000/api/blogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          createdby, // send author to backend
          name,
          desc,
          category,
          publishedAt: new Date(publishedAt),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || "Blog Created", "success");
        setName("");
        setDesc("");
        setCategory("");
        setPublishedAt(new Date());
      } else {
        showAlert(data.message || "Failed to create blog", "error");
      }
    } catch (err) {
      console.log("Submit error:", err);
      showAlert("Server Error", "error");
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add New Blog</Text>

        {/* Author (read-only) */}
        <TextInput
          style={styles.input}
          placeholder="Author"
          placeholderTextColor="#aaa"
          value={createdby}
          editable={false}
        />

        {/* Blog Name */}
        <TextInput
          style={styles.input}
          placeholder="Blog Name"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />

        {/* Description */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description"
          placeholderTextColor="#aaa"
          value={desc}
          onChangeText={setDesc}
          multiline
        />

        {/* Category Picker */}
        <View style={styles.pickerContainer}>
          <RNPickerSelect
            onValueChange={(value) => setCategory(value)}
            items={categories}
            placeholder={{ label: "Select Category", value: null }}
            value={category}
            style={{
              inputIOS: styles.input,
              inputAndroid: styles.input,
            }}
          />
        </View>

        {/* Date Picker */}
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.datePickerText}>
            {publishedAt ? publishedAt.toDateString() : "Select Publish Date"}
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

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Create Blog</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomBar />

      {/* Custom Toast Alert */}
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
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#000",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    width: "100%",
    marginBottom: 15,
  },
  datePickerButton: {
    width: "100%",
    backgroundColor: "#111",
    borderColor: "#222",
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  datePickerText: {
    color: "#fff",
  },
  submitButton: {
    width: "100%",
    backgroundColor: "#2ecc71",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
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
});
