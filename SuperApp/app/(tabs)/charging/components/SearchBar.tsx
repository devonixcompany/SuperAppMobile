import { Ionicons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface SearchBarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchSubmit: () => void;
  onFocus?: () => void;
  placeholder?: string;
}

export default function SearchBar({
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onFocus,
  placeholder = "ค้นหา",
}: SearchBarProps) {
  const searchInputRef = useRef<TextInput>(null);

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrapper}>
        <Ionicons
          name="search"
          size={20}
          color="#9ca3af"
          style={styles.searchIcon}
        />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={onSearchQueryChange}
          onFocus={onFocus}
          returnKeyType="search"
          onSubmitEditing={onSearchSubmit}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => onSearchQueryChange("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={styles.searchButton} onPress={onSearchSubmit}>
        <Text style={styles.searchButtonText}>ค้นหา</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 8,
    zIndex: 10,
    elevation: 3,
    shadowColor: "#FFFFFF80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});