import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BottomBar from "../components/BottomBar";

export default function HomeScreen() {
  const [userName, setUserName] = useState("");

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [blogs, setBlogs] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userSearch, setUserSearch] = useState("");
  const [blogSearch, setBlogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const categories = ["All", "Coding", "Fun", "Entertainment", "Other"];

  useEffect(() => {
    getUser();
    fetchAllUsers();
    fetchAllBlogs();
  }, []);

  useEffect(() => filterUsers(), [userSearch, users]);
  useEffect(() => filterBlogs(), [blogSearch, selectedCategory, blogs]);

  const getUser = async () => {
    const user = await AsyncStorage.getItem("user");
    if (user) setUserName(JSON.parse(user).name);
  };

  const fetchAllUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await fetch("http://192.168.100.77:5000/api/auth/users");
      const data = await res.json();
      setUsers(data.userAccounts || []);
      setFilteredUsers(data.userAccounts || []);
    } catch {
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAllBlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://192.168.100.77:5000/api/blogs");
      const data = await res.json();
      setBlogs(data.blogs || []);
      setFilteredBlogs(data.blogs || []);
    } catch {
      setBlogs([]);
      setFilteredBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let temp = [...users];
    if (userSearch) {
      temp = temp.filter((u) =>
        u.name?.toLowerCase().includes(userSearch.toLowerCase()),
      );
    }
    setFilteredUsers(temp);
  };

  const filterBlogs = () => {
    let temp = [...blogs];

    if (selectedCategory !== "All") {
      temp = temp.filter(
        (b) => b.category?.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    if (blogSearch) {
      temp = temp.filter(
        (b) =>
          b.name?.toLowerCase().includes(blogSearch.toLowerCase()) ||
          b.desc?.toLowerCase().includes(blogSearch.toLowerCase()),
      );
    }

    setFilteredBlogs(temp);
  };

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  return (
    <>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView>
          {/* 🔹 HEADER */}
          <View style={styles.header}>
            <Text style={styles.hello}>Hello, {userName || "Guest"} 👋</Text>
            <Text style={styles.subText}>Explore and interact with users</Text>
          </View>

          {/* 🔹 USERS SEARCH */}
          <Text style={styles.sectionTitle}>All Users</Text>
          <TextInput
            placeholder="Search users..."
            placeholderTextColor="#777"
            style={styles.searchInput}
            value={userSearch}
            onChangeText={setUserSearch}
          />

          {usersLoading ? (
            <ActivityIndicator color="#2ecc71" />
          ) : filteredUsers.length === 0 ? (
            <Text style={{ color: "#777", marginLeft: 15, marginTop: 10 }}>
              No users found
            </Text>
          ) : (
            <FlatList
              data={filteredUsers}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{
                paddingHorizontal: 15,
                marginBottom: 20,
              }}
              pagingEnabled={filteredUsers.length > 3}
              snapToAlignment="start"
              decelerationRate={filteredUsers.length > 3 ? "fast" : "normal"}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.userCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {getInitials(item.name)}
                    </Text>
                  </View>
                  <Text style={styles.userName} numberOfLines={2}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}

          {/* 🔹 BLOGS SEARCH + FILTER */}
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
            <ActivityIndicator size="large" color="#2ecc71" />
          ) : filteredBlogs.length === 0 ? (
            <Text style={{ color: "#777", marginTop: 20, marginLeft: 15 }}>
              No blogs found
            </Text>
          ) : (
            <FlatList
              data={filteredBlogs}
              keyExtractor={(item) => item._id}
              style={{ width: "100%", paddingHorizontal: 15, marginTop: 10 }}
              scrollEnabled={false} // let ScrollView handle scrolling
              renderItem={({ item }) => (
                <View style={styles.blogCard}>
                  <Text style={styles.blogTitle}>{item.name}</Text>
                  <Text style={styles.blogDesc}>{item.desc}</Text>
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
  userCard: {
    width: 100,
    alignItems: "center",
    marginRight: 15,
  },
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
  blogTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  blogDesc: { color: "#aaa", marginVertical: 6 },
  blogFooter: { flexDirection: "row", justifyContent: "space-between" },
  blogCategory: { color: "#2ecc71", fontWeight: "bold", marginLeft: 5 },
  blogDate: { color: "#777", fontSize: 11 },
  blogcategoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap", 
    marginHorizontal: -5, 
  },

  categoryHeading: {
    color: "#ccc",
    fontWeight: "bold",
    marginBottom: 5,
  },
});
