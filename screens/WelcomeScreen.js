import { View, Text, StyleSheet, Image } from "react-native";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function WelcomeScreen({ navigation }) {

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        navigation.replace("HomeScreen");
      } else {
        navigation.replace("LoginScreen");
      }
    } catch (err) {
      console.log("Error checking login:", err);
      navigation.replace("LoginScreen");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Logo */}
      <Image
        source={require("../assets/butt.png")}
        style={styles.logo}
      />

      {/* App Name */}
      <Text style={styles.title}>BlogEver</Text>

      {/* Description */}
      <Text style={styles.description}>
        A modern platform to write, share, and explore blogs from creators around the world.
      </Text>

      {/* Version */}
      <Text style={styles.version}>Version 1.0.0</Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 Powered by <Text style={styles.brand}>Butt Networks</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginBottom: 20,
    borderRadius: 100,
    borderColor: "white",
    borderWidth: 1,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  description: {
    color: "#999",
    fontSize: 14,
    marginTop: 15,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  version: {
    color: "#555",
    fontSize: 12,
    marginTop: 20,
  },
  footer: {
    position: "absolute",
    bottom: 50,
  },
  footerText: {
    color: "#777",
    fontSize: 12,
  },
  brand: {
    color: "#fff",
    fontWeight: "600",
  },
});
