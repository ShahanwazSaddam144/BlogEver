import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import BottomBar from "../components/BottomBar";

export default function FullBlogScreen({ route }) {
  const { blogId } = route.params;
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlog();
  }, []);

  const fetchBlog = async () => {
    try {
      const res = await fetch(`http://192.168.100.77:5000/api/blogs/${blogId}`);
      const data = await res.json();
      setBlog(data.blog || data); 
    } catch (err) {
      console.log("Fetch blog error:", err);
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
    <>
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Blog Title */}
      <Text style={styles.blogTitle}>{blog.name}</Text>

      {/* Author & Date */}
      <View style={styles.blogMeta}>
        <Text style={styles.blogAuthor}>By {blog.createdby || "Unknown"}</Text>
        <Text style={styles.blogDate}>
          {new Date(blog.publishedAt).toDateString()}
        </Text>
      </View>

      {/* Category */}
      {blog.category && (
        <View style={styles.blogCategoryContainer}>
          <Text style={styles.categoryLabel}>Category:</Text>
          <Text style={styles.blogCategory}>{blog.category}</Text>
        </View>
      )}

      {/* Description */}
      <Text style={styles.blogDesc}>{blog.desc}</Text>
    </ScrollView>
    <BottomBar />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    color: "#fff",
    fontSize: 16,
  },
  blogTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  blogMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  blogAuthor: {
    color: "#2ecc71",
    fontWeight: "bold",
    fontSize: 14,
  },
  blogDate: {
    color: "#777",
    fontSize: 12,
  },
  blogCategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  categoryLabel: {
    color: "#ccc",
    fontWeight: "bold",
    marginRight: 6,
    fontSize: 13,
  },
  blogCategory: {
    color: "#2ecc71",
    fontWeight: "bold",
    fontSize: 13,
  },
  blogDesc: {
    color: "#aaa",
    fontSize: 15,
    lineHeight: 22,
  },
});
