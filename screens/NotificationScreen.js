import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";
import Ionicons from "react-native-vector-icons/Ionicons";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import BottomBar from "../components/BottomBar";

/* 🔔 Notification behavior */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

export default function NotificationScreen() {
  const [notification, setNotification] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    registerForNotifications();
    checkNotifications();
  }, []);

  /* 📲 Ask permission */
  const registerForNotifications = async () => {
    if (!Device.isDevice) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  };

  /* 🔥 Send mobile notification */
  const sendMobileNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });
  };

  /* ✅ Helpers to prevent repeated notifications */
  const wasNotificationSent = async (key) => {
    const sent = await AsyncStorage.getItem(key);
    return sent === "true";
  };

  const markNotificationSent = async (key) => {
    await AsyncStorage.setItem(key, "true");
  };

  const checkNotifications = async () => {
    const userData = await AsyncStorage.getItem("user");
    if (!userData) return;

    const user = JSON.parse(userData);
    setUserEmail(user.email);

    const createdAtKey = `accountCreated_${user.email}`;
    let createdAt = await AsyncStorage.getItem(createdAtKey);

    if (!createdAt) {
      createdAt = Date.now().toString();
      await AsyncStorage.setItem(createdAtKey, createdAt);
    }

    const now = Date.now();

    // ----- Welcome Notification -----
    const welcomeDismissed = await AsyncStorage.getItem(
      `welcomeDismissed_${user.email}`
    );
    const welcomeSentKey = `welcomeSent_${user.email}`;
    const welcomeSent = await wasNotificationSent(welcomeSentKey);

    if (!welcomeDismissed && !welcomeSent) {
      const notif = {
        id: "welcome",
        title: "Welcome 🎉",
        message: `Welcome ${user.email}! Your account was created successfully.`,
      };

      setNotification(notif);
      sendMobileNotification(notif.title, notif.message);
      await markNotificationSent(welcomeSentKey);
      return;
    }

    // ----- Feedback Notification (5 days later) -----
    const feedbackDismissed = await AsyncStorage.getItem(
      `feedbackDismissed_${user.email}`
    );
    const feedbackSentKey = `feedbackSent_${user.email}`;
    const feedbackSent = await wasNotificationSent(feedbackSentKey);

    if (
      now - parseInt(createdAt) >= FIVE_DAYS &&
      !feedbackDismissed &&
      !feedbackSent
    ) {
      const notif = {
        id: "feedback",
        title: "We care ❤️",
        message: "Are you enjoying the app? Let us know your experience!",
      };

      setNotification(notif);
      sendMobileNotification(notif.title, notif.message);
      await markNotificationSent(feedbackSentKey);
      return;
    }

    // If no notifications to show
    setNotification(null);
  };

  const dismissNotification = async () => {
    if (!notification) return;

    await AsyncStorage.setItem(
      `${notification.id}Dismissed_${userEmail}`,
      "true"
    );
    setNotification(null);
    setShowConfirm(false);
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.header}>Notifications</Text>
        <View style={styles.line} />

        {notification ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="notifications" size={22} color="#fff" />
              <Text style={styles.cardTitle}>{notification.title}</Text>

              <TouchableOpacity onPress={() => setShowConfirm(true)}>
                <Ionicons name="close" size={20} color="#aaa" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cardMessage}>{notification.message}</Text>
          </View>
        ) : (
          <Text style={styles.noMessage}>No messages</Text>
        )}
      </View>

      <BottomBar />

      {/* ❌ Delete modal */}
      <Modal transparent visible={showConfirm} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons
              name="trash-outline"
              size={40}
              color="#ff4d4d"
              style={{ marginBottom: 10 }}
            />

            <Text style={styles.modalTitle}>Delete Notification</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this message?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={dismissNotification}
              >
                <Text style={styles.btnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    paddingTop: 60,
    alignItems: "center",
  },
  header: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "bold",
  },
  line: {
    width: 120,
    height: 2,
    backgroundColor: "#444",
    marginVertical: 12,
  },
  card: {
    backgroundColor: "#1c1c1e",
    width: "88%",
    padding: 15,
    borderRadius: 14,
    marginTop: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    marginLeft: 10,
  },
  cardMessage: {
    color: "#ccc",
    fontSize: 15,
    marginTop: 10,
    lineHeight: 22,
  },
  noMessage: {
    color: "#aaa",
    fontSize: 16,
    marginTop: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#1c1c1e",
    width: "80%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalText: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginVertical: 10,
  },
  modalActions: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  cancelBtn: {
    backgroundColor: "#333",
    paddingVertical: 10,
    borderRadius: 10,
    width: "45%",
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "#ff4d4d",
    paddingVertical: 10,
    borderRadius: 10,
    width: "45%",
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
});
