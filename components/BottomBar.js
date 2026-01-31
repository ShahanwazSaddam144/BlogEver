import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";


export default function BottomBar(navigate) {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState("Home");
  const [userToken, setUserToken] = useState(null);


  useEffect(() => {
    const loadToken = async () => {
      const token = await AsyncStorage.getItem("refreshToken");
      if (!token) {
        navigation.replace("Login");
      } else {
        setUserToken(token);
      }
    };
    loadToken();
  }, []);
 

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("HomeScreen")}>
          <Ionicons
            name="home-outline"
            size={28}
            color={activeTab === "Home" ? "#fff" : "#777"}
          />
          <Text style={[styles.label, activeTab === "Home" && { color: "#fff" }]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("AddBlogScreen")}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color={activeTab === "Chats" ? "#fff" : "#777"}
          />
          <Text style={[styles.label, activeTab === "Chats" && { color: "#fff" }]}>
            Blogs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate("ProfileScreen")}>
          <Ionicons
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
