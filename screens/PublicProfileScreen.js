import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  TouchableOpacity, // Added
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Added for the back icon
import BottomBar from "../components/BottomBar";
import { secureFetch } from "api/apiClient";

export default function PublicProfileScreen({ route, navigation }) { // Added navigation
  const { email, name } = route.params;

  const [profile, setProfile] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [email]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await secureFetch(
        `/api/users/profile/${encodeURIComponent(email)}`
      );

      if (!res.ok) throw new Error("Profile not found");

      const data = await res.json();
      setProfile(data);
      setBlogs(data.blogs || []);
    } catch (err) {
      console.log("Fetch error:", err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (fullName = "") =>
    fullName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  // Define Header to be used inside FlatList
  const ProfileHeader = () => (
    <View style={styles.headerContainer}>
      {/* --- Breadcrumb Row --- */}
      <View style={styles.breadcrumbContainer}>
        <TouchableOpacity 
          style={styles.breadcrumbTouch} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.breadcrumbLink}>Home</Text>
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={14} color="#555" style={{ marginHorizontal: 4 }} />
        <Text style={styles.breadcrumbCurrent}>{name}</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(name)}</Text>
      </View>

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.role}>{profile?.role || "User"}</Text>

      {/* Profile Info Card */}
      <View style={styles.card}>
        <Text style={styles.label}>Description</Text>
        <Text style={styles.value}>
            {profile?.desc ? String(profile.desc) : "No description provided."}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Age</Text>
        <Text style={styles.value}>
          {profile?.age ? String(profile.age) : "—"}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile?.email}</Text>
      </View>

      <Text style={styles.blogTitle}>
        Blogs by {name} ({blogs.length})
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {!profile ? (
        <View style={styles.center}>
          <Text style={{ color: "#fff" }}>Profile not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
             <Text style={{ color: "#2ecc71" }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={blogs}
          keyExtractor={(item) => item._id || Math.random().toString()}
          ListHeaderComponent={ProfileHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.noBlogs}>No blogs posted yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.blogCardWrapper}>
              <View style={styles.blogCard}>
                <Text style={styles.blogName}>{item.name ?? item.title}</Text>
                <Text style={styles.blogDesc} numberOfLines={3}>
                  {item.desc ?? "—"}
                </Text>
                <View style={styles.blogFooter}>
                  <View style={styles.blogcategoryContainer}>
                    <Text style={styles.categoryHeading}>Category:</Text>
                    <Text style={styles.blogCategory}>{item.category ?? "General"}</Text>
                  </View>
                  <Text style={styles.blogDate}>
                    {item.createdAt ? new Date(item.createdAt).toDateString() : ""}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
      <BottomBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  // Breadcrumb Styles
  breadcrumbContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
    backgroundColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  breadcrumbTouch: {
    paddingVertical: 2,
  },
  breadcrumbLink: {
    color: "#2ecc71",
    fontSize: 13,
    fontWeight: "500",
  },
  breadcrumbCurrent: {
    color: "#888",
    fontSize: 13,
  },
  // Rest of styles
  headerContainer: {
    alignItems: "center",
    paddingTop: 15,
    paddingHorizontal: 16,
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
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#111",
    width: "100%",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  label: {
    color: "#888",
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase",
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
    alignSelf: "flex-start",
    marginBottom: 15,
  },
  noBlogs: {
    color: "#777",
    textAlign: "center",
    marginTop: 20,
  },
  blogCardWrapper: {
    paddingHorizontal: 16,
  },
  blogCard: {
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  blogName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  blogDesc: {
    color: "#aaa",
    marginTop: 6,
    lineHeight: 20,
  },
  blogFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  blogcategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryHeading: {
    color: "#777",
    fontSize: 12,
    marginRight: 4,
  },
  blogCategory: {
    color: "#2ecc71",
    fontWeight: "bold",
    fontSize: 12,
  },
  blogDate: {
    color: "#555",
    fontSize: 11,
  },
});