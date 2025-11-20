import API_CONFIG from "@/config/api.config";
import { http } from "@/services/api";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type NewsTag = {
  id?: string;
  label: string;
  color?: string;
};

export type NewsItem = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  tags?: NewsTag[];
  updatedAt?: string;
};

export type RecommendationItem = {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  source?: string;
  date?: string;
};

type NewsApiTag = {
  id?: string;
  name?: string;
  description?: string;
  color?: string;
};

type NewsApiItem = {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  imageUrl?: string;
  tags?: string | (NewsApiTag | string)[];
  updatedAt?: string;
};

export const NEWS_API_BASE_URL = API_CONFIG.ENDPOINTS.USER.NEWS;
// รองรับการส่งพารามิเตอร์สำหรับการแบ่งหน้า/ค้นหา
export type FetchNewsOptions = {
  page?: number;
  limit?: number;
  tagIds?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
};

export type NewsResponsive = {
  newsCardWidth: number;
  newsImageHeight: number;
  recommendationCardWidth: number;
  recommendationAvatar: number;
  cardSpacing: number;
  horizontalGutter: number;
  isSmallPhone?: boolean;
};

export const recommendationTopics: RecommendationItem[] = [
  {
    id: "1",
    title: "ยกระดับการชาร์จรถยนต์ไฟฟ้าของคุณ",
    subtitle: "ขอแนะนำ Autel Maxicharger AC Wallbox",
    image:
      "https://cdn.shopify.com/s/files/1/0603/1710/6336/files/Hero_Image_V2X_FLAT.png?v=1757449758&width=2048",
    source: "PONIX",
    date: "5 กันยายน 2568",
  },
  {
    id: "2",
    title: "วางแผนการเดินทางจังหวัดใหญ่ทั่วไทย",
    subtitle: "เลือกหัวข้อที่เหมาะกับไลฟ์สไตล์ของคุณ",
    image:
      "https://cdn.prod.website-files.com/64b825ce3428b050ac90c545/684332c60f14de0d7d69526c_F10-Nonfleet.webp",
    source: "PONIX Travel",
    date: "30 สิงหาคม 2568",
  },
  {
    id: "3",
    title: "เทคนิคเพิ่มคะแนน PONIX Point ให้ไวขึ้น",
    subtitle: "เก็บครบทุกภารกิจ รับคะแนนต่อเนื่อง",
    image:
      "https://itp1.itopfile.com/ImageServer/z_itp_23052022wg8w/0/0/PONIXMAC5z-z815739368938.webp",
    source: "PONIX Club",
    date: "25 สิงหาคม 2568",
  },
];

const normalizeNewsTags = (
  input?: string | (NewsApiTag | string)[],
): NewsTag[] => {
  if (!input) {
    return [];
  }

  if (typeof input === "string") {
    const label = input.trim();
    return label.length ? [{ label }] : [];
  }

  if (!Array.isArray(input)) {
    return [];
  }

  const normalized: NewsTag[] = [];
  for (const raw of input) {
    if (!raw) {
      continue;
    }

    if (typeof raw === "string") {
      const label = raw.trim();
      if (label.length) {
        normalized.push({ label });
      }
      continue;
    }

    const label = raw.description?.trim() || raw.name?.trim();
    if (!label) {
      continue;
    }

    normalized.push({
      id: raw.id,
      color: raw.color?.trim(),
      label,
    });
  }

  return normalized;
};

export const mapNewsApiItemToNews = (item: NewsApiItem): NewsItem => {
  return {
    id: item.id,
    title: item.title ?? "",
    subtitle: item.content ?? item.excerpt ?? "",
    image: item.imageUrl,
    tags: normalizeNewsTags(item.tags),
    updatedAt: item.updatedAt,
  };
};

const formatUpdatedAt = (iso?: string) => {
  if (!iso) {
    return undefined;
  }

  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }

    return date.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return undefined;
  }
};

export async function fetchNewsFromApi(options?: FetchNewsOptions) {
  try {
    const response = await http.get<NewsApiItem[]>(NEWS_API_BASE_URL, {
      params: options,
    });
    const payload = response?.data ?? [];
    const rows: NewsApiItem[] = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object"
        ? [payload as NewsApiItem]
        : [];
    const mapped = rows
      .map(mapNewsApiItemToNews)
      .filter((item) => item.id && item.title);

    console.log("[News] fetched", mapped.length, "items");
    if (__DEV__) {
      console.log("[News] sample item", mapped[0]);
    }

    return mapped;
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return [];
  }
}

type NewsSectionsProps = {
  responsive: NewsResponsive;
  newsItems?: NewsItem[];
  recommendationItems?: RecommendationItem[];
  onNewsPress?: (item: NewsItem) => void;
  onRecommendationPress?: (item: RecommendationItem) => void;
};

export default function NewsSections({
  responsive,
  newsItems = [],
  recommendationItems = recommendationTopics,
  onNewsPress,
  onRecommendationPress,
}: NewsSectionsProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const hasNews = newsItems.length > 0;

  return (
    <>
      {/* ข่าวสารอัพเดต */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>ข่าวสารอัพเดต</Text>
            <Text style={styles.sectionBadge}>ใหม่</Text>
          </View>
          <Text style={styles.sectionMore}>เลื่อนดูเพิ่มเติม</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingRight: responsive.horizontalGutter,
          }}
        >
          {hasNews ? (
            newsItems.map((item, index) => {
              const updatedLabel = formatUpdatedAt(item.updatedAt);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onNewsPress?.(item)}
                  style={[
                    styles.newsCard,
                    {
                      width: responsive.newsCardWidth,
                      marginRight:
                        index === newsItems.length - 1 ? 0 : responsive.cardSpacing,
                    },
                  ]}
                >
                  {item.image && !failedImages[item.id] ? (
                    <Image
                      source={{ uri: item.image }}
                      resizeMode="cover"
                      style={[
                        styles.newsImage,
                        { height: responsive.newsImageHeight },
                      ]}
                      onError={(e) => {
                        console.warn(
                          "[News] image load error",
                          item.image,
                          e.nativeEvent?.error,
                        );
                        setFailedImages((prev) => ({ ...prev, [item.id]: true }));
                      }}
                    />
                  ) : (
                    <View
                      style={[
                        styles.newsImage,
                        styles.placeholderBg,
                        { height: responsive.newsImageHeight },
                      ]}
                    >
                      <Text style={styles.placeholderText}>ภาพ</Text>
                    </View>
                  )}
                  <View style={styles.newsBody}>
                    {item.tags && item.tags.length > 0 ? (
                      <View style={styles.newsTagsRow}>
                        {item.tags.map((tag, tagIndex) => {
                          const label = (tag.label ?? "").trim();
                          if (!label) {
                            return null;
                          }
                          const backgroundColor = tag.color ?? "#E0F2FE";
                          const textColor = tag.color ? "#FFFFFF" : "#0284C7";
                          return (
                            <View
                              key={tag.id ?? `${item.id}-${label}-${tagIndex}`}
                              style={[styles.newsTag, { backgroundColor }]}
                            >
                              <Text style={[styles.newsTagText, { color: textColor }]}>
                                {label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                    <Text style={styles.newsTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.newsSubtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                    {updatedLabel ? (
                      <Text style={styles.newsMeta}>อัปเดต {updatedLabel}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyNews}>
              <Text style={styles.placeholderText}>ไม่มีข่าว</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* หัวข้อแนะนำ */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, styles.sectionHeaderSpacing]}>
          <Text style={styles.sectionTitle}>หัวข้อแนะนำ</Text>
          <Pressable hitSlop={8}>
            <Text style={styles.sectionMore}>เลื่อนดูเพิ่มเติม</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingRight: responsive.horizontalGutter,
          }}
        >
          {recommendationItems.map((topic, index) => (
            <Pressable
              key={topic.id}
              onPress={() => onRecommendationPress?.(topic)}
              style={[
                styles.recommendCard,
                {
                  width: responsive.recommendationCardWidth,
                  marginRight:
                    index === recommendationItems.length - 1
                      ? 0
                      : responsive.cardSpacing,
                },
              ]}
            >
              <View style={styles.recommendRow}>
                {topic.image ? (
                  <Image
                    source={{ uri: topic.image }}
                    style={{
                      width: responsive.recommendationAvatar,
                      height: responsive.recommendationAvatar,
                      borderRadius: 16,
                    }}
                  />
                ) : (
                  <View
                    style={[
                      styles.recommendAvatarPlaceholder,
                      {
                        width: responsive.recommendationAvatar,
                        height: responsive.recommendationAvatar,
                        borderRadius: 16,
                      },
                    ]}
                  >
                    <Text style={styles.placeholderText}>ภาพ</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.recommendTextWrap,
                    { marginLeft: responsive.isSmallPhone ? 12 : 16 },
                  ]}
                >
                  <Text style={styles.recommendTitle} numberOfLines={1}>
                    {topic.title}
                  </Text>
                  {topic.subtitle ? (
                    <Text style={styles.recommendSubtitle} numberOfLines={2}>
                      {topic.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.recommendFooter}>
                <Text style={styles.recommendSource}>{topic.source}</Text>
                <Text style={styles.recommendDate}>{topic.date}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  sectionHeaderSpacing: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  sectionBadge: {
    marginLeft: 8,
    fontSize: 12,
    color: "#3B82F6",
  },
  sectionMore: {
    fontSize: 13,
    color: "#6B7280",
  },
  newsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  newsImage: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  newsBody: {
    padding: 16,
  },
  newsTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginBottom: 12,
  },
  newsTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
    marginBottom: 8,
    marginRight: 8,
  },
  newsTagText: {
    color: "#0284C7",
    fontSize: 12,
    fontWeight: "600",
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  newsSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },
  newsMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "#9CA3AF",
  },
  recommendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recommendTextWrap: {
    flex: 1,
  },
  recommendTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  recommendSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  recommendFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  recommendSource: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  recommendDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  recommendAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  placeholderText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  placeholderBg: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  emptyNews: {
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
});
