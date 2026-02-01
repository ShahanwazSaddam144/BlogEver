import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { secureFetch } from "api/apiClient"; // Adjust path as needed

const { width } = Dimensions.get("window");

export default function PublicProfileScreen({ route, navigation }) {
  const { email } = route.params; // Get email passed from HomeScreen
  const [profile, setProfile] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicData();
  }, [email]);

  const fetchPublicData = async () => {
    try {
      setLoading(true);

      const profileRes = await secureFetch(
        `/api/users/profile/${encodeURIComponent(email)}`,
      );

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }
      const blogRes = await secureFetch(
        `/api/blogs/user/${encodeURIComponent(email)}`,
      );

      if (blogRes.ok) {
        const blogData = await blogRes.json();
        setBlogs(blogData.blogs || []);
      }
    } catch (err) {
      console.error("Error fetching public profile:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      {/* --- Header / Back Button --- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
      </View>

      {/* --- Profile Card --- */}
      {profile ? (
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile.name || "U")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{profile.name}</Text>
              <Text style={styles.email}>{profile.email}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{profile.role || "Member"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{blogs.length}</Text>
              <Text style={styles.statLabel}>Blogs</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>
                {profile.age ? profile.age : "N/A"}
              </Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.desc}>
            {profile.desc || "No description provided."}
          </Text>
        </View>
      ) : (
        <Text style={styles.errorText}>User details not found.</Text>
      )}

      {/* --- User's Blogs Section --- */}
      <Text style={styles.blogSectionTitle}>
        Blogs by {profile?.name?.split(" ")[0] || "User"}
      </Text>

      {blogs.length === 0 ? (
        <Text style={styles.emptyText}>No blogs posted yet.</Text>
      ) : (
        blogs.map((item) => (
          <TouchableOpacity
            key={item._id}
            style={styles.blogCard}
            onPress={() =>
              navigation.navigate("FullBlogScreen", { blogId: item._id })
            }
          >
            <Text style={styles.blogTitle}>{item.name}</Text>
            {item.image?.url && (
              <Image
                source={{ uri: item.image.url }}
                style={styles.blogImage}
                resizeMode="cover"
              />
            )}
            <Text numberOfLines={2} style={styles.blogDesc}>
              {item.desc}
            </Text>
            <Text style={styles.readMore}>Read Article →</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: { marginRight: 15 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },

  // Profile Card Styles
  profileCard: {
    backgroundColor: "#111",
    marginHorizontal: 15,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222",
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  avatarText: { fontSize: 30, fontWeight: "bold", color: "#000" },
  profileInfo: { flex: 1 },
  name: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  email: { color: "#888", fontSize: 13, marginTop: 2 },
  badge: {
    backgroundColor: "#222",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  badgeText: {
    color: "#2ecc71",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  stat: { alignItems: "center" },
  statVal: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  statLabel: { color: "#666", fontSize: 12 },

  divider: { height: 1, backgroundColor: "#222", marginBottom: 15 },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  desc: { color: "#ccc", fontSize: 14, lineHeight: 22 },
  errorText: { color: "#e74c3c", textAlign: "center", marginTop: 20 },

  // Blog List Styles
  blogSectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
    marginTop: 30,
    marginBottom: 15,
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },
  blogCard: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  blogTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  blogImage: { width: "100%", height: 150, borderRadius: 8, marginBottom: 10 },
  blogDesc: { color: "#aaa", fontSize: 13 },
  readMore: {
    color: "#2ecc71",
    marginTop: 10,
    fontSize: 12,
    fontWeight: "bold",
  },
});
