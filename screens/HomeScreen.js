import React, { useEffect, useState, useRef, useCallback } from "react";
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
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";
import Notifications from "../components/Notifications";
import { secureFetch } from "api/apiClient";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

// --- Skeleton Component ---
const BlogSkeleton = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.blogCard}>
      <View style={styles.blogAuthorContainer}>
        <Animated.View style={[styles.skeletonAvatar, { opacity }]} />
        <Animated.View style={[styles.skeletonLine, { width: 100, opacity }]} />
      </View>
      <Animated.View
        style={[
          styles.skeletonLine,
          { width: "70%", height: 20, marginBottom: 15, opacity },
        ]}
      />
      <Animated.View style={[styles.skeletonImage, { opacity }]} />
      <Animated.View style={[styles.skeletonLine, { width: "90%", opacity }]} />
      <Animated.View style={[styles.skeletonLine, { width: "40%", opacity }]} />
    </View>
  );
};

// --- Header Component (Extracted to fix Input Focus Bug) ---
const HomeHeader = ({
  userName,
  userSearch,
  setUserSearch,
  userSearchResults,
  searchingUsers,
  blogSearch,
  setBlogSearch,
  selectedCategory,
  setSelectedCategory,
  categories,
}) => {
  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.hello}>Hello, {userName || "Guest"} 👋</Text>
        <Text style={styles.subText}>Explore and interact with users</Text>
      </View>

      <Text style={styles.sectionTitle}>Find Users</Text>
      <TextInput
        placeholder="Search users by name..."
        placeholderTextColor="#777"
        style={styles.searchInput}
        value={userSearch}
        onChangeText={setUserSearch}
        autoCapitalize="none"
      />

      <View style={{ minHeight: 10 }}>
        {searchingUsers ? (
          <ActivityIndicator
            color="#2ecc71"
            style={{ marginLeft: 20, alignSelf: "flex-start" }}
          />
        ) : userSearchResults.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.userListContainer}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {userSearchResults.map((user) => (
              <TouchableOpacity
                key={user.email}
                style={styles.userResultCard}
                // --- ADD ONPRESS HERE ---
                onPress={() =>
                  navigation.navigate("PublicProfileScreen", {
                    email: user.email,
                  })
                }
              >
                <View style={styles.userResultAvatar}>
                  <Text style={styles.userResultAvatarText}>
                    {(user.name || "U")[0].toUpperCase()}
                  </Text>
                </View>
                <Text numberOfLines={1} style={styles.userResultName}>
                  {user.name}
                </Text>
                {/* Optional Role */}
                {user.role ? (
                  <Text style={{ color: "#666", fontSize: 10 }}>
                    {user.role}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : userSearch.length > 1 ? (
          <Text style={styles.noUsersText}>No users found</Text>
        ) : null}
      </View>

      {/* --- Blog Search & Filter Section --- */}
      <Text style={styles.sectionTitle}>All Blogs</Text>
      <TextInput
        placeholder="Search blogs..."
        placeholderTextColor="#777"
        style={styles.searchInput}
        value={blogSearch}
        onChangeText={setBlogSearch}
      />
      <View style={styles.categoryRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.categoryBtn,
              selectedCategory === cat && styles.activeCategory,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat && { color: "#000" },
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function HomeScreen({ navigation }) {
  const [userName, setUserName] = useState("");

  // Blog State
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // User Search State
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // Filter State
  const [blogSearch, setBlogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const pageRef = useRef(1);
  const PAGE_SIZE = 5;
  const allBlogsCache = useRef([]);
  const [allModeFallback, setAllModeFallback] = useState(false);

  const categories = ["All", "Coding", "Fun", "Entertainment", "Other"];

  useEffect(() => {
    getUser();
    fetchFirstPage();
  }, []);

  // --- Debounced User Search ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (userSearch.trim().length > 0) {
        searchUsers(userSearch);
      } else {
        setUserSearchResults([]);
      }
    }, 500); // Wait 500ms after typing stops

    return () => clearTimeout(delayDebounceFn);
  }, [userSearch]);

  const handleAuthFailure = async () => {
    try {
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("token");
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    } catch (e) {
      console.error("Auth reset error", e);
    }
  };

  const getUser = async () => {
    try {
      const user = await AsyncStorage.getItem("user");
      if (user) setUserName(JSON.parse(user).name);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Fetch Users Logic ---
  const searchUsers = async (query) => {
    setSearchingUsers(true);
    try {
      const trimedQuery = query.trim();
      const res = await secureFetch(
        `/api/users/${encodeURIComponent(trimedQuery)}`,
        {
          method: "GET",
        },
      );

      if (res.status === 401) {
        handleAuthFailure();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setUserSearchResults(data.profile || []);
      } else {
        setUserSearchResults([]);
      }
    } catch (err) {
      console.error("User search error:", err);
      setUserSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  // --- Fetch Blogs Logic ---
  const fetchPageFromServer = async (page = 1) => {
    try {
      const res = await secureFetch(
        `/api/blogs?page=${page}&limit=${PAGE_SIZE}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (res.status === 401) {
        handleAuthFailure();
        return false;
      }

      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      const received = data.blogs || [];

      setBlogs((prev) => (page === 1 ? received : [...prev, ...received]));
      setHasMore(received.length === PAGE_SIZE);
      return true;
    } catch (err) {
      return false;
    }
  };

  const fetchAllAndCache = async () => {
    try {
      const res = await secureFetch("/api/blogs", { method: "GET" });
      if (res.status === 401) {
        handleAuthFailure();
        return false;
      }
      const data = await res.json();
      const all = data.blogs || [];
      allBlogsCache.current = all;
      setBlogs(all.slice(0, PAGE_SIZE));
      setHasMore(all.length > PAGE_SIZE);
      setAllModeFallback(true);
      return true;
    } catch (e) {
      return false;
    }
  };

  const fetchFirstPage = async () => {
    setLoading(true);
    const ok = await fetchPageFromServer(1);
    if (!ok && !allModeFallback) await fetchAllAndCache();
    setLoading(false);
  };

  const fetchMore = async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    const nextPage = pageRef.current + 1;

    if (allModeFallback) {
      const start = (nextPage - 1) * PAGE_SIZE;
      const next = allBlogsCache.current.slice(start, start + PAGE_SIZE);
      if (next.length > 0) {
        setBlogs((prev) => [...prev, ...next]);
        pageRef.current = nextPage;
        if (start + next.length >= allBlogsCache.current.length)
          setHasMore(false);
      }
    } else {
      const ok = await fetchPageFromServer(nextPage);
      if (ok) pageRef.current = nextPage;
    }
    setLoadingMore(false);
  };

  const getRenderedBlogs = () => {
    if (loading) return [1, 2, 3];

    return blogs.filter((b) => {
      const matchesCat =
        selectedCategory === "All" ||
        (b.category || "").toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !blogSearch ||
        (b.name || "").toLowerCase().includes(blogSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Notifications />
      <FlatList
        data={getRenderedBlogs()}
        keyExtractor={(item, index) =>
          loading ? `skeleton-${index}` : item._id || index.toString()
        }
        // IMPORTANT: Passing the HomeHeader component here
        ListHeaderComponent={
          <HomeHeader
            userName={userName}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            userSearchResults={userSearchResults}
            searchingUsers={searchingUsers}
            blogSearch={blogSearch}
            setBlogSearch={setBlogSearch}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={categories}
          />
        }
        renderItem={({ item, index }) =>
          loading ? (
            <BlogSkeleton />
          ) : (
            <BlogItem item={item} index={index} navigation={navigation} />
          )
        }
        onEndReached={fetchMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color="#2ecc71" style={{ margin: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !loading && (
            <Text style={{ color: "#777", textAlign: "center", marginTop: 20 }}>
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
      <Text numberOfLines={3} style={styles.blogDesc}>
        {item.desc}
      </Text>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("FullBlogScreen", { blogId: item._id })
        }
      >
        <Text style={{ color: "#2ecc71", marginTop: 5 }}>Read more</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

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
  // User Search Styles
  userListContainer: {
    paddingLeft: 15,
    marginBottom: 10,
  },
  userResultCard: {
    marginRight: 15,
    alignItems: "center",
    width: 70,
  },
  userResultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#444",
  },
  userResultAvatarText: {
    color: "#2ecc71",
    fontWeight: "bold",
    fontSize: 18,
  },
  userResultName: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
  noUsersText: {
    color: "#555",
    marginLeft: 15,
    marginBottom: 10,
    fontSize: 13,
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
  blogDesc: { color: "#aaa", marginVertical: 6 },

  // --- Skeleton Styles ---
  skeletonAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#222",
    marginRight: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#222",
    borderRadius: 6,
    marginVertical: 4,
  },
  skeletonImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#222",
    borderRadius: 10,
    marginVertical: 10,
  },
});
