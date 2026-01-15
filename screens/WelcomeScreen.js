import { View, Text, StyleSheet, Image } from "react-native";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

export default function WelcomeScreen({ navigation }) {

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("LoginScree");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

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
      <Text style={styles.subtitle}>Share your thoughts ✍️</Text>

      {/* 🔽 ADDED DETAILS */}
      <Text style={styles.description}>
        A modern platform to write, share, and explore blogs from creators around the world.
      </Text>


      <Text style={styles.version}>Version 1.0.0</Text>
      {/* 🔼 ADDED DETAILS */}

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
    width: 110,
    height: 110,
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
  subtitle: {
    color: "#aaa",
    marginTop: 10,
    fontSize: 16,
  },

  /* 🔽 ADDED STYLES */
  description: {
    color: "#999",
    fontSize: 14,
    marginTop: 15,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  features: {
    marginTop: 15,
  },
  feature: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  version: {
    color: "#555",
    fontSize: 12,
    marginTop: 20,
  },
  /* 🔼 ADDED STYLES */

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
