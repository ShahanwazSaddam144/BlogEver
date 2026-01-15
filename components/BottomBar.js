import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

export default function BottomBar() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("Home");

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
            await AsyncStorage.removeItem("user");
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
        {/* Home */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("Home")}
        >
          <Icon
            name="home-outline"
            size={28}
            color={activeTab === "Home" ? "#fff" : "#777"}
          />
          <Text style={[styles.label, activeTab === "Home" && { color: "#fff" }]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Chats */}
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab("Chats")}
        >
          <Icon
            name="chatbubble-ellipses-outline"
            size={28}
            color={activeTab === "Chats" ? "#fff" : "#777"}
          />
          <Text style={[styles.label, activeTab === "Chats" && { color: "#fff" }]}>
            Chats
          </Text>
        </TouchableOpacity>

        {/* Profile */}
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
    backgroundColor: "#000000",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 40,
    paddingTop: 10, 
    borderTopColor: "#222",
    borderTopWidth: 1,
    backgroundColor: "#000000",
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
