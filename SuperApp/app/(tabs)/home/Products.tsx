import API_CONFIG from "@/config/api.config";
import { http } from "@/services/api";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { NewsResponsive } from "./News";

export type ProductTag = {
  id?: string;
  label: string;
  color?: string;
};

export type ProductItem = {
  id: string;
  name: string;
  description?: string;
  content?: string;
  image?: string;
  tags?: ProductTag[];
  updatedAt?: string;
};

type ProductApiTag = {
  id?: string;
  name?: string;
  description?: string;
  color?: string;
};

type ProductApiItem = {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  tags?: string | (ProductApiTag | string)[];
  updatedAt?: string;
};

export const PRODUCT_API_BASE_URL = API_CONFIG.ENDPOINTS.USER.PRODUCTS;

export type FetchProductsOptions = {
  page?: number;
  limit?: number;
  tagIds?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
};

const safeTrim = (value?: string | null) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeProductTags = (
  input?: string | (ProductApiTag | string)[],
): ProductTag[] => {
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

  const normalized: ProductTag[] = [];
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

const extractProductArray = (payload: any): ProductApiItem[] => {
  // รองรับโครงสร้าง payload หลายแบบ (data, items, array ตรง ๆ, object เดี่ยว)
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (payload?.data) {
    return extractProductArray(payload.data);
  }

  if (payload?.items) {
    return extractProductArray(payload.items);
  }

  if (typeof payload === "object") {
    return [payload as ProductApiItem];
  }

  return [];
};

export const mapProductApiItemToProduct = (item: ProductApiItem): ProductItem => {
  return {
    id: item.id,
    name: safeTrim(item.name) ?? "",
    description: safeTrim(item.description),
    content: safeTrim(item.description),
    image: safeTrim(item.imageUrl),
    tags: normalizeProductTags(item.tags),
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

export async function fetchProductsFromApi(options?: FetchProductsOptions) {
  try {
    const response = await http.get<ProductApiItem[]>(PRODUCT_API_BASE_URL, {
      params: options,
    });
    const payload = response?.data as any;
    const rows: ProductApiItem[] = extractProductArray(payload);
    const mapped = rows
      .map(mapProductApiItemToProduct)
      .filter((item) => item.id && item.name);

    console.log("[Products] fetched", mapped.length, "items");
    if (__DEV__) {
      console.log("[Products] sample item", mapped[0]);
    }

    return mapped;
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
}

type ProductsProps = {
  responsive: NewsResponsive;
  items?: ProductItem[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onProductPress?: (item: ProductItem) => void;
};

export default function Products({
  responsive,
  items = [],
  isLoading,
  errorMessage,
  onProductPress,
}: ProductsProps) {
  const [selectedProduct, setSelectedProduct] = React.useState<ProductItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const detailRequestIdRef = React.useRef(0);
  const hasProducts = items.length > 0;
  const selectedUpdatedLabel = selectedProduct
    ? formatUpdatedAt(selectedProduct.updatedAt)
    : undefined;

  const fetchProductDetail = async (productId: string) => {
    if (!productId) {
      return;
    }

    const requestId = ++detailRequestIdRef.current;
    setIsDetailLoading(true);
    setDetailError(null);

    try {
      const response = await http.get<ProductApiItem | { data?: ProductApiItem }>(
        `${PRODUCT_API_BASE_URL}/${encodeURIComponent(productId)}`,
      );
      const payload = response?.data as any;
      const rows = extractProductArray(payload);
      const mapped = rows.length ? mapProductApiItemToProduct(rows[0]) : null;

      if (!mapped?.id) {
        throw new Error("Invalid product detail response");
      }

      if (detailRequestIdRef.current !== requestId) {
        return;
      }

      setSelectedProduct((prev) => {
        const base = prev && prev.id === mapped.id ? prev : null;
        return {
          ...(base ?? {}),
          ...mapped,
          description: mapped.description ?? base?.description,
          content: mapped.content ?? base?.content ?? mapped.description,
          image: mapped.image ?? base?.image,
          tags: mapped.tags?.length ? mapped.tags : base?.tags,
          updatedAt: mapped.updatedAt ?? base?.updatedAt,
          name: mapped.name ?? base?.name ?? "",
        };
      });
    } catch (error) {
      console.error("[Products] failed to fetch detail", error);
      if (detailRequestIdRef.current === requestId) {
        setDetailError("โหลดรายละเอียดสินค้าไม่สำเร็จ");
      }
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setIsDetailLoading(false);
      }
    }
  };

  const handleProductPress = (item: ProductItem) => {
    onProductPress?.(item);
    setDetailError(null);
    setSelectedProduct(item);
    fetchProductDetail(item.id);
  };

  const handleCloseModal = () => {
    detailRequestIdRef.current += 1;
    setSelectedProduct(null);
    setDetailError(null);
    setIsDetailLoading(false);
  };

  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, styles.sectionHeaderSpacing]}>
        <Text style={styles.sectionTitle}>สินค้าแนะนำ</Text>
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
        {isLoading ? (
          <View style={styles.statusRow}>
            <Text style={styles.placeholderText}>กำลังโหลดสินค้า...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.statusRow}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : hasProducts ? (
          items.map((item, index) => {
            const updatedLabel = formatUpdatedAt(item.updatedAt);
            return (
              <Pressable
                key={item.id}
                onPress={() => handleProductPress(item)}
                style={[
                  styles.recommendCard,
                  {
                    width: responsive.recommendationCardWidth,
                    marginRight:
                      index === items.length - 1 ? 0 : responsive.cardSpacing,
                  },
                ]}
              >
                <View style={styles.recommendRow}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
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
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={styles.recommendSubtitle} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    {item.tags && item.tags.length > 0 ? (
                      <View style={styles.recommendTagsRow}>
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
                              style={[styles.recommendTag, { backgroundColor }]}
                            >
                              <Text style={[styles.recommendTagText, { color: textColor }]}>
                                {label}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                    {updatedLabel ? (
                      <Text style={styles.recommendMeta}>อัปเดต {updatedLabel}</Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyProducts}>
            <Text style={styles.placeholderText}>ไม่มีสินค้า</Text>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseModal} />
          <View style={styles.modalCard}>
            {selectedProduct?.image ? (
              <Image source={{ uri: selectedProduct.image }} style={styles.modalImage} />
            ) : null}
            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentInner}
              showsVerticalScrollIndicator={false}
            >
              {selectedProduct?.tags && selectedProduct.tags.length > 0 ? (
                <View style={styles.modalTagsRow}>
                  {selectedProduct.tags.map((tag, idx) => {
                    const label = (tag.label ?? "").trim();
                    if (!label) {
                      return null;
                    }
                    const backgroundColor = tag.color ?? "#E0F2FE";
                    const textColor = tag.color ? "#FFFFFF" : "#0284C7";
                    return (
                      <View
                        key={tag.id ?? `${selectedProduct.id}-${label}-${idx}`}
                        style={[styles.recommendTag, { backgroundColor }]}
                      >
                        <Text style={[styles.recommendTagText, { color: textColor }]}>
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
              {selectedProduct?.description ? (
                <Text style={styles.modalSubtitle}>{selectedProduct.description}</Text>
              ) : null}
              {isDetailLoading ? (
                <View style={styles.modalStatusRow}>
                  <ActivityIndicator color="#2563EB" />
                  <Text style={styles.modalStatusText}>กำลังโหลดรายละเอียด...</Text>
                </View>
              ) : detailError ? (
                <View style={styles.modalStatusColumn}>
                  <Text style={styles.modalErrorText}>{detailError}</Text>
                  <Pressable
                    style={styles.modalRetryButton}
                    onPress={() =>
                      selectedProduct?.id ? fetchProductDetail(selectedProduct.id) : null
                    }
                    hitSlop={8}
                  >
                    <Text style={styles.modalRetryText}>ลองอีกครั้ง</Text>
                  </Pressable>
                </View>
              ) : selectedProduct?.content ? (
                <Text style={styles.modalBodyText}>{selectedProduct.content}</Text>
              ) : (
                <Text style={styles.modalMutedText}>ไม่มีรายละเอียดเพิ่มเติม</Text>
              )}
              {selectedUpdatedLabel ? (
                <Text style={styles.modalMeta}>อัปเดต {selectedUpdatedLabel}</Text>
              ) : null}
            </ScrollView>
            <Pressable style={styles.modalCloseButton} onPress={handleCloseModal}>
              <Text style={styles.modalCloseText}>ปิด</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
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
  sectionMore: {
    fontSize: 13,
    color: "#6B7280",
  },
  recommendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  recommendRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  recommendTextWrap: {
    flex: 1,
  },
  recommendTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  recommendSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  recommendTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 6,
  },
  recommendTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E0F2FE",
    marginRight: 6,
    marginBottom: 6,
  },
  recommendTagText: {
    color: "#0284C7",
    fontSize: 12,
    fontWeight: "600",
  },
  recommendMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "#9CA3AF",
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
  statusRow: {
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  errorText: {
    color: "#DC2626",
    fontWeight: "700",
  },
  emptyProducts: {
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  modalImage: {
    width: "100%",
    height: 180,
  },
  modalContent: {
    maxHeight: 280,
  },
  modalContentInner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalSubtitle: {
    marginTop: 10,
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  modalMeta: {
    marginTop: 10,
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalBodyText: {
    marginTop: 12,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  modalMutedText: {
    marginTop: 12,
    fontSize: 14,
    color: "#9CA3AF",
  },
  modalStatusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  modalStatusColumn: {
    marginTop: 12,
    alignItems: "flex-start",
  },
  modalStatusText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4B5563",
  },
  modalErrorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  modalRetryButton: {
    marginTop: 6,
  },
  modalRetryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  modalCloseButton: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
});
