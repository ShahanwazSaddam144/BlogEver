import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import BottomBar from "../components/BottomBar";
import { secureFetch } from "api/apiClient";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FullBlogScreen({ route, navigation }) {
  const { blogId } = route.params;

  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (blogId) {
      fetchBlog();
    }
  }, [blogId]);

  const fetchBlog = async () => {
    try {
      const res = await secureFetch(`/api/blogs/${blogId}`);

      if (!res.ok) {
        throw new Error("Blog not found");
      }

      const data = await res.json();
      setBlog(data.blog);
    } catch (err) {
      console.log("Fetch blog error:", err.message);
      setBlog(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!blog) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Blog not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Breadcrumb (kept in layout flow) --- */}
        <View style={styles.breadcrumbContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.breadcrumbLink}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#fff"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.breadcrumbTextActive}>Home</Text>
          </TouchableOpacity>

          <Text style={styles.breadcrumbSeparator}> &gt; </Text>

          <Text style={styles.breadcrumbTextInactive}>Blog</Text>
        </View>

        {/* --- Hero Image --- */}
        {blog.image?.url ? (
          <Image
            source={{ uri: blog.image.url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderHeader} />
        )}

        <View style={styles.contentContainer}>
          {/* Category Chip */}
          {blog.category && (
            <View style={styles.categoryWrapper}>
              <Text style={styles.categoryText}>
                {blog.category.toUpperCase()}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.blogTitle}>{blog.name}</Text>

          {/* Meta Data */}
          <View style={styles.metaContainer}>
            <View style={styles.authorRow}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {blog.createdby?.charAt(0).toUpperCase() || "A"}
                </Text>
              </View>
              <View>
                <Text style={styles.blogAuthor}>
                  {blog.createdby || "Unknown Author"}
                </Text>
                <Text style={styles.blogDate}>
                  {blog.publishedAt
                    ? new Date(blog.publishedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Draft"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description rendered as Markdown */}
          <View style={{ marginBottom: 30 }}>
            <Markdown
              style={markdownStyles}
              // You can add rules or onLinkPress etc. if needed
            >
              {blog.desc || ""}
            </Markdown>
          </View>
        </View>
      </ScrollView>

      <BottomBar />
    </View>
  );
}

const markdownStyles = {
  body: {
    color: "#ddd",
    fontSize: 17,
    lineHeight: 28,
    fontWeight: "400",
  },
  heading1: {
    color: "#fff",
    fontSize: 28,
    marginBottom: 8,
  },
  heading2: {
    color: "#fff",
    fontSize: 22,
    marginBottom: 6,
  },
  link: {
    color: "#2ecc71",
  },
  image: {
    // ensure markdown images fit nicely
    width: SCREEN_WIDTH - 40,
    height: (SCREEN_WIDTH - 40) * 0.56, // approximate 16:9
    resizeMode: "cover",
    marginVertical: 12,
    borderRadius: 10,
  },
  code_block: {
    backgroundColor: "#111",
    color: "#0f0",
    padding: 12,
    borderRadius: 6,
  },
  // you can override more rule keys — see package docs
};

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
  notFoundText: { color: "#fff", fontSize: 16 },

  breadcrumbContainer: {
    // NOTE: `position: "fixed"` is invalid in RN — use "absolute" if you want overlay.
    // Keeping it in layout flow so it sits above image (you used to want that).
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 20,
    alignSelf: "flex-start",
  },
  breadcrumbLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  breadcrumbTextActive: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  breadcrumbSeparator: {
    color: "#888",
    fontSize: 14,
    marginHorizontal: 5,
  },
  breadcrumbTextInactive: {
    color: "#aaa",
    fontSize: 14,
  },

  // Hero Image
  heroImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#1a1a1a",
  },
  placeholderHeader: {
    width: "100%",
    height: 100,
    backgroundColor: "#000",
  },
  contentContainer: {
    paddingHorizontal: 20,
    marginTop: -30,
    backgroundColor: "#000",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
    minHeight: 500,
  },
  // Category
  categoryWrapper: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(46, 204, 113, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(46, 204, 113, 0.3)",
  },
  categoryText: {
    color: "#2ecc71",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // Typography
  blogTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    marginBottom: 20,
  },
  // Meta
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#444",
  },
  avatarText: {
    color: "#ccc",
    fontWeight: "bold",
    fontSize: 18,
  },
  blogAuthor: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  blogDate: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#222",
    marginBottom: 25,
  },
});
