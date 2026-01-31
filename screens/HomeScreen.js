import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";
import Notifications from "../components/Notifications";
import { secureFetch } from "api/apiClient";
import Markdown from "react-native-markdown-display"; // NEW

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {
  // ... all your existing state, effects and functions unchanged ...
  // (I left them out here for brevity — keep your existing logic exactly as-is)
  // fetchFirstPage, fetchMore, getRenderedBlogs, renderHeader, etc.
  // Ensure you keep the rest of your original component code.

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Notifications />
      <FlatList
        data={getRenderedBlogs()}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <BlogItem item={item} index={index} navigation={navigation} />
        )}
        onEndReached={fetchMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#2ecc71" style={{ margin: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !loading && (
            <Text style={{ color: "#777", textAlign: "center" }}>
              No blogs found
            </Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <BottomBar />
    </View>
  );
}

/* ---------- BlogItem (updated to render Markdown short desc) ---------- */
const BlogItem = ({ item, index, navigation }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      delay: index * 40,
      useNativeDriver: true,
    }).start();
  }, []);

  // If desc might be undefined, ensure fallback
  const desc = item.desc || "";

  return (
    <Animated.View
      style={[
        styles.blogCard,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.blogAuthorContainer}>
        <View style={styles.blogAvatar}>
          <Text style={styles.blogAvatarText}>
            {item.createdby?.[0] || "U"}
          </Text>
        </View>
        <Text style={styles.blogAuthor}>{item.createdby || "Unknown"}</Text>
      </View>

      <Text style={styles.blogTitle}>{item.name}</Text>

      {item.image?.url && (
        <Image
          source={{ uri: item.image.url }}
          style={styles.blogImage}
          resizeMode="cover"
        />
      )}

      {/* Markdown preview: visually truncated with maxHeight + overflow hidden */}
      <View style={styles.markdownPreviewContainer}>
        <Markdown style={markdownStyles} numberOfLines={3}>
          {desc}
        </Markdown>
      </View>

      <TouchableOpacity
        onPress={() =>
          navigation.navigate("FullBlogScreen", { blogId: item._id })
        }
      >
        <Text style={{ color: "#2ecc71", marginTop: 8 }}>Read more</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ---------- Markdown styling (tweak to match your theme) ---------- */
const markdownStyles = {
  body: {
    color: "#aaa",
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    color: "#2ecc71",
  },
  // add other overrides if needed
};

/* ---------- Styles (added container for markdown preview) ---------- */
const styles = StyleSheet.create({
  header: { paddingTop: 45, paddingBottom: 15, alignItems: "center" },
  hello: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  subText: { color: "#888", fontSize: 13, marginTop: 4 },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 15,
    marginTop: 15,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  categoryBtn: {
    borderWidth: 1,
    borderColor: "#2ecc71",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 10,
  },
  activeCategory: { backgroundColor: "#2ecc71" },
  categoryText: { color: "#2ecc71", fontSize: 12 },
  blogCard: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 12,
  },
  blogAuthorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  blogAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  blogAvatarText: { color: "#000", fontWeight: "bold" },
  blogAuthor: { color: "#fff", fontWeight: "bold" },
  blogTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  blogImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginVertical: 10,
  },

  /* NEW: container that truncates the rendered Markdown */
  markdownPreviewContainer: {
    maxHeight: 66, // ~3 lines at 20px lineHeight -> adjust as needed
    overflow: "hidden",
    marginVertical: 6,
  },

  blogDesc: { color: "#aaa", marginVertical: 6 },
});
