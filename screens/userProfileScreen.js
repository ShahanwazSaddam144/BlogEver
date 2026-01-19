import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import BottomBar from "../components/BottomBar";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function UserProfileScreen({ route }) {
  const { email, name } = route.params;

  const [profile, setProfile] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchUserBlogs();
  }, []);

  // Fetch user profile
  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(
        `http://192.168.100.77:5000/api/profile/${email}`, // public route
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`, // optional if route is public
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Profile not found");

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.log("Fetch profile error:", err.message);
      setProfile(null);
    }
  };

  // Fetch blogs by this user
  const fetchUserBlogs = async () => {
    try {
      const res = await fetch(`http://192.168.100.77:5000/api/blogs/by-email/${email}`);
      if (!res.ok) throw new Error("Blogs not found");

      const data = await res.json();
      setBlogs(data.blogs || []);
    } catch (err) {
      console.log("Fetch blogs error:", err.message);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  // Loading state
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  // Profile not found
  if (!profile) {
    return (
      <>
        <View style={styles.center}>
          <Text style={{ color: "#fff" }}>Profile not found</Text>
        </View>
        <BottomBar />
      </>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>

        {/* Name & Role */}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>{profile.role}</Text>

        {/* Profile Info */}
        <View style={styles.card}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.value}>{profile.desc}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Age</Text>
          <Text style={styles.value}>{profile.age}</Text>
        </View>

        {/* User Blogs */}
        <Text style={styles.blogTitle}>Blogs by {name}</Text>

        {blogs.length === 0 ? (
          <Text style={styles.noBlogs}>No blogs found</Text>
        ) : (
          <FlatList
            data={blogs}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <View style={styles.blogCard}>
                <Text style={styles.blogName}>{item.name}</Text>
                <Text style={styles.blogDesc} numberOfLines={5} ellipsizeMode="tail">
                  {item.desc}</Text>

                <View style={styles.blogFooter}>
                  <View style={styles.blogcategoryContainer}>
                    <Text style={styles.categoryHeading}>Category:</Text>
                    <Text style={styles.blogCategory}>{item.category}</Text>
                  </View>
                  <Text style={styles.blogDate}>
                    {new Date(item.publishedAt).toDateString()}
                  </Text>
                </View>
              </View>
            )}
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
    backgroundColor: "#000",
    alignItems: "center",
    paddingTop: 60,
  },

  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },

  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  avatarText: {
    color: "#000",
    fontSize: 36,
    fontWeight: "bold",
  },

  name: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 5,
  },

  role: {
    color: "#2ecc71",
    fontSize: 14,
    marginBottom: 25,
  },

  card: {
    backgroundColor: "#111",
    width: "90%",
    borderRadius: 14,
    padding: 16,
  },

  label: {
    color: "#888",
    fontSize: 13,
    marginBottom: 4,
    fontWeight: "600",
  },

  value: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },

  divider: {
    height: 1,
    backgroundColor: "#222",
    marginVertical: 10,
  },

  blogTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 10,
  },

  noBlogs: {
    color: "#777",
    marginTop: 10,
  },

  blogCard: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    width: "100%",
  },

  blogName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  blogDesc: {
    color: "#aaa",
    marginTop: 4,
  },

  blogFooter: { flexDirection: "row", justifyContent: "space-between" },
  blogcategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },
  categoryHeading: { color: "#ccc", fontWeight: "bold", marginRight: 5, marginTop: 3 },
  blogCategory: { color: "#2ecc71", fontWeight: "bold" },
  blogDate: { color: "#777", fontSize: 11 },
});
