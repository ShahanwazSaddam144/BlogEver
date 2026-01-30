// src/screens/HomeScreen.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";
import Notifications from "../components/Notifications";
import { secureFetch } from "api/apiClient";

const WINDOW_HEIGHT = Dimensions.get("window").height;

export default function HomeScreen({ navigation }) {
  const [userName, setUserName] = useState("");

  const [filteredUsers, setFilteredUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [blogs, setBlogs] = useState([]); // currently loaded pages concatenated
  const [loading, setLoading] = useState(true); // initial load
  const [loadingMore, setLoadingMore] = useState(false); // for pagination
  const [hasMore, setHasMore] = useState(true); // whether more pages exist
  const pageRef = useRef(1); // current page
  const PAGE_SIZE = 5;

  const [allModeFallback, setAllModeFallback] = useState(false); // fallback if backend doesn't support paging
  const allBlogsCache = useRef([]); // used for client-side paging fallback

  const [userSearch, setUserSearch] = useState("");
  const [blogSearch, setBlogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", "Coding", "Fun", "Entertainment", "Other"];

  const [users, setUsers] = useState([]);

  // viewability config for FlatList
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 10,
    waitForInteraction: false,
  };

  // load user
  useEffect(() => {
    getUser();
    fetchAllUsers();
    fetchFirstPage();
  }, []);

  useEffect(
    () => filterBlogsClientSide(),
    [blogSearch, selectedCategory, blogs],
  );

  const getUser = async () => {
    const user = await AsyncStorage.getItem("user");
    if (user) setUserName(JSON.parse(user).name);
  };

  // Placeholder (you had a fetchAllUsers function referenced)
  const fetchAllUsers = async () => {
    setUsersLoading(true);
    try {
      // implement your users fetch here. For now keep empty or fetch from endpoint
      const res = await secureFetch("/api/users", { method: "GET" }).catch(
        () => null,
      );
      if (res && res.ok) {
        const { users: dataUsers } = await res.json();
        setUsers(dataUsers || []);
        setFilteredUsers(dataUsers || []);
      } else {
        setUsers([]);
        setFilteredUsers([]);
      }
    } catch (e) {
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  // Primary fetch - tries server-side pagination first
  const fetchPageFromServer = async (page = 1) => {
    try {
      const res = await secureFetch(
        `/api/blogs?page=${page}&limit=${PAGE_SIZE}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!res.ok) {
        // Server doesn't support paginated endpoint or error -> throw to trigger fallback
        throw new Error(`Server responded ${res.status}`);
      }

      const data = await res.json(); // expect { blogs: [...], total?: number, page?: number }
      const received = data.blogs || [];
      // Append
      if (page === 1) {
        setBlogs(received);
      } else {
        setBlogs((prev) => [...prev, ...received]);
      }

      // If server returned total or length less than page size decide hasMore
      if (Array.isArray(received) && received.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        // if server includes total we can compute
        if (typeof data.total === "number") {
          const loaded = (page - 1) * PAGE_SIZE + received.length;
          setHasMore(loaded < data.total);
        } else {
          // assume there might be more
          setHasMore(received.length === PAGE_SIZE);
        }
      }

      return true;
    } catch (err) {
      // signal failure to use fallback
      return false;
    }
  };

  // Fallback: fetch all once and then paginate on client
  const fetchAllAndCache = async () => {
    try {
      const res = await secureFetch("/api/blogs", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("failed to fetch all blogs");

      const data = await res.json();
      const all = data.blogs || [];
      allBlogsCache.current = all;
      // take first page
      const first = all.slice(0, PAGE_SIZE);
      setBlogs(first);
      setHasMore(all.length > first.length);
      setAllModeFallback(true);
      return true;
    } catch (e) {
      // give up
      setBlogs([]);
      setHasMore(false);
      setAllModeFallback(true);
      return false;
    }
  };

  const fetchFirstPage = async () => {
    setLoading(true);
    pageRef.current = 1;
    setHasMore(true);
    setAllModeFallback(false);

    const ok = await fetchPageFromServer(1);
    if (!ok) {
      // fallback to fetching all and client pagination
      await fetchAllAndCache();
    }
    setLoading(false);
  };

  const fetchMore = async () => {
    if (!hasMore) return;
    // If currently loading more, ignore
    if (loadingMore || loading) return;

    setLoadingMore(true);
    try {
      if (allModeFallback) {
        // client-side pagination from allBlogsCache
        const nextPage = pageRef.current + 1;
        const start = (nextPage - 1) * PAGE_SIZE;
        const next = allBlogsCache.current.slice(start, start + PAGE_SIZE);
        if (next.length > 0) {
          setBlogs((prev) => [...prev, ...next]);
          pageRef.current = nextPage;
          if (start + next.length >= allBlogsCache.current.length)
            setHasMore(false);
        } else {
          setHasMore(false);
        }
      } else {
        // server-side fetch
        const nextPage = pageRef.current + 1;
        const ok = await fetchPageFromServer(nextPage);
        if (ok) pageRef.current = nextPage;
        else {
          // if server page failed unexpectedly, try fallback to all mode
          const did = await fetchAllAndCache();
          if (did) {
            pageRef.current = 1; // we've loaded first page already in fallback
          }
        }
      }
    } catch (e) {
      console.error("fetchMore error:", e);
    } finally {
      setLoadingMore(false);
    }
  };

  // Viewable items changed callback: if user has scrolled to within 3 items of end, fetch more
  const onViewableItemsChanged = useRef(({ viewableItems, changed }) => {
    if (!viewableItems || viewableItems.length === 0) return;
    const maxIndexVisible = Math.max(...viewableItems.map((v) => v.index ?? 0));
    // if max visible index >= (loadedCount - 3) then trigger next page
    if (maxIndexVisible >= Math.max(0, blogs.length - 3) - 0) {
      if (hasMore && !loadingMore) {
        fetchMore();
      }
    }
  }).current;

  // Filtering function (client-side) - applies search & category on the loaded items
  const filterBlogsClientSide = () => {
    // Already the UI uses filteredBlogs before; here we just filter the currently loaded blogs
    // For simplicity we'll store filteredBlogs in state so UI can use it (but we can also derive directly)
    // Instead of keeping a separate filtered state, we'll just keep using blogs but we must consider filters in rendering.
  };

  // Render animated blog item
  const BlogItem = ({ item, index }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: index * 40, // slight stagger
        useNativeDriver: true,
      }).start();
    }, []);

    const translateY = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [8, 0],
    });

    const opacity = anim;
   
    return (
      <Animated.View
        style={[styles.blogCard, { opacity, transform: [{ translateY }] }]}
      >
        <View style={styles.blogAuthorContainer}>
          <View style={styles.blogAvatar}>
            <Text style={styles.blogAvatarText}>
              {getInitials(item.createdby)}
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

        <Text numberOfLines={5} ellipsizeMode="tail" style={styles.blogDesc}>
          {item.desc}
        </Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("FullBlogScreen", {
              blogId: item._id,
            })
          }
        >
          <Text style={{ color: "#2ecc71", marginTop: 5 }}>Read more</Text>
        </TouchableOpacity>

        <View style={styles.blogFooter}>
          <View style={styles.blogcategoryContainer}>
            <Text style={styles.categoryHeading}>Category:</Text>
            <Text style={styles.blogCategory}>{item.category}</Text>
          </View>
          <Text style={styles.blogDate}>
            {new Date(item.publishedAt).toDateString()}
          </Text>
        </View>
      </Animated.View>
    );
  };

  // Helper: initials
  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  // derive filtered list from blogs + filters
  const getRenderedBlogs = () => {
    let temp = [...blogs];
    if (selectedCategory && selectedCategory !== "All") {
      temp = temp.filter(
        (b) =>
          (b.category || "").toLowerCase() === selectedCategory.toLowerCase(),
      );
    }
    if (blogSearch) {
      temp = temp.filter(
        (b) =>
          (b.name || "").toLowerCase().includes(blogSearch.toLowerCase()) ||
          (b.desc || "").toLowerCase().includes(blogSearch.toLowerCase()),
      );
    }
    return temp;
  };

  const renderedBlogs = getRenderedBlogs();

  return (
    <>
      <Notifications />
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView style={{ flex: 1 }}>
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.hello}>Hello, {userName || "Guest"} 👋</Text>
            <Text style={styles.subText}>Explore and interact with users</Text>
          </View>

          {/* USERS */}
          <Text style={styles.sectionTitle}>All Users</Text>

          <TextInput
            placeholder="Search users..."
            placeholderTextColor="#777"
            style={styles.searchInput}
            value={userSearch}
            onChangeText={setUserSearch}
          />

          
          {/* BLOGS */}
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

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#2ecc71"
              style={{ marginTop: 20 }}
            />
          ) : renderedBlogs.length === 0 ? (
            <Text style={{ color: "#777", marginLeft: 15 }}>
              No blogs found
            </Text>
          ) : (
            <FlatList
              data={renderedBlogs}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{
                paddingHorizontal: 15,
                paddingBottom: 60,
              }}
              renderItem={({ item, index }) => (
                <BlogItem item={item} index={index} />
              )}
              scrollEnabled={false} // keep same behaviour as before (wrapped scrollview)
              onEndReached={fetchMore}
              onEndReachedThreshold={0.4}
            />
          )}

          {loadingMore && (
            <View style={{ padding: 12, alignItems: "center" }}>
              <ActivityIndicator color="#2ecc71" />
            </View>
          )}
        </ScrollView>
      </View>

      <BottomBar />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 45,
    paddingBottom: 15,
    alignItems: "center",
    marginTop: 25,
  },
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
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  userCard: { width: 100, alignItems: "center", marginRight: 15 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#000", fontSize: 20, fontWeight: "bold" },
  userName: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 0,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
  },
  blogImage: {
  width: "30vw",
  height: 180,
  borderRadius: 10,
  marginVertical: 10,
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
  blogAvatarText: { color: "#000", fontWeight: "bold", fontSize: 14 },
  blogAuthor: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  blogTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  blogDesc: { color: "#aaa", marginVertical: 6 },
  blogFooter: { flexDirection: "row", justifyContent: "space-between" },
  blogcategoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
  },
  categoryHeading: { color: "#ccc", fontWeight: "bold", marginRight: 5 },
  blogCategory: { color: "#2ecc71", fontWeight: "bold" },
  blogDate: { color: "#777", fontSize: 11 },
});
