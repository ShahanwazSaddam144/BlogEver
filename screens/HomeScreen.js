import { View, Text, StyleSheet } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";

export default function HomeScreen() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const user = await AsyncStorage.getItem("user");
      if (user) {
        const parsedUser = JSON.parse(user);
        setUserName(parsedUser.name); 
      }
    } catch (err) {
      console.log("Error fetching user:", err);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.text}>Hello, {userName ? userName : "Guest"}!</Text>
      </View>
      <BottomBar />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  text: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
});
