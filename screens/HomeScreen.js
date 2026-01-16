import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";

export default function HomeScreen() {
  const [userName, setUserName] = useState("");
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    }
  };

  const fetchAllBlogs = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://192.168.100.77:5000/api/blogs");
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.blogs || []);
      } else {
        console.log("Failed to fetch blogs");
        setBlogs([]);
      }
    } catch (err) {
      console.log("Fetch blogs error:", err);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllBlogs();
  }, []);

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.text}>Hello, {userName || "Guest"}!</Text>

        <Text style={[styles.text, { marginTop: 20 }]}>All Blogs:</Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2ecc71"
            style={{ marginTop: 20 }}
          />
        ) : blogs.length === 0 ? (
          <Text style={{ color: "#888", marginTop: 10 }}>
            No blogs available.
          </Text>
        ) : (
          <FlatList
            data={blogs}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.blogCard}>
                <Text style={styles.blogTitle}>
                  {item.createdby || item.email || "Unknown Author"}
                </Text>
                <Text style={styles.blogTitle}>{item.name}</Text>
                <Text style={styles.blogDesc}>{item.desc}</Text>
                <Text style={styles.blogCategory}>{item.category}</Text>
                <Text style={styles.blogDate}>
                  {new Date(item.publishedAt).toDateString()}
                </Text>
              </View>
            )}
            style={{ marginTop: 15, width: "100%" }}
          />
        )}
      </View>

      <BottomBar />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 50,
  },
  blogCard: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  blogTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  blogDesc: {
    color: "#aaa",
    marginVertical: 5,
  },
  blogCategory: {
    color: "#2ecc71",
    fontWeight: "bold",
  },
  blogDate: {
    color: "#888",
    fontSize: 12,
    marginTop: 5,
  },
});
