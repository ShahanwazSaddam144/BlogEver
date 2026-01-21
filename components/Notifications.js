import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function Notifications(navigate) {
    const navigation = useNavigation();

  return (
    <View style={styles.container}>
      
      {/* 🔔 Notification Icon */}
      <TouchableOpacity style={styles.notificationIcon} onPress={() => navigation.navigate("NotificationScreen")}>
        <Ionicons
          name="notifications-outline"
          size={26}
          color="#fff"   
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  notificationIcon: {
    position: "absolute",
    top: 15,
    marginTop: 15,
    right: 20,
    zIndex: 10,
  },
  text: {
    color: "#fff",
    textAlign: "center",
    marginTop: 100,
    fontSize: 18,
  },
});
