import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

export default function BottomBar() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("Home");
  const [userToken, setUserToken] = useState(null);

  // Load token on mount to keep user logged in
  useEffect(() => {
    const loadToken = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        navigation.replace("LoginScreen");
      } else {
        setUserToken(token);
      }
    };
    loadToken();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Call backend logout (optional if token is server-verified)
              await fetch("http://192.168.100.77:5000/logout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${userToken}`,
                },
              });
            } catch (error) {
              console.log("Logout API error", error);
            }
            await AsyncStorage.removeItem("token"); // remove token
            await AsyncStorage.removeItem("user");  // remove user info
            navigation.replace("LoginScreen");
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleProfileClick = () => {
    Alert.alert(
      "Profile",
      "Choose an action",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: handleLogout, style: "destructive" },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab("Home")}>
          <Icon
            name="home-outline"
            size={28}
            color={activeTab === "Home" ? "#fff" : "#777"}
          />
          <Text style={[styles.label, activeTab === "Home" && { color: "#fff" }]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab("Chats")}>
          <Icon
            name="chatbubble-ellipses-outline"
            size={28}
            color={activeTab === "Chats" ? "#fff" : "#777"}
          />
          <Text style={[styles.label, activeTab === "Chats" && { color: "#fff" }]}>
            Chats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={handleProfileClick}>
          <Icon
            name="person-outline"
            size={28}
            color={activeTab === "Profile" ? "#fff" : "#777"}
          />
          <Text style={[styles.label, activeTab === "Profile" && { color: "#fff" }]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#000",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 35,
    paddingTop: 10,
    borderTopColor: "#222",
    borderTopWidth: 1,
    backgroundColor: "#000",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#777",
    fontSize: 12,
    marginTop: 3,
  },
});
