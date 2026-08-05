import { isHttpMode } from "../config";
import { http } from "../client";
import { endpoints as E } from "../endpoints";
import {
  getAdminSnapshot,
  createProductReview,
  updateReviewStatus,
  deleteReview,
} from "@/lib/admin-store";
import type { Review, ReviewStatus } from "../types";

export const reviewsApi = {
  async byProduct(productId: string): Promise<Review[]> {
    if (isHttpMode()) return http.get<Review[]>(E.reviews.byProduct(productId));
    return getAdminSnapshot().reviews.filter((r) => r.productId === productId);
  },

  async list(): Promise<Review[]> {
    if (isHttpMode()) return http.get<Review[]>(E.reviews.list());
    return getAdminSnapshot().reviews;
  },

  async create(
    productId: string,
    input: {
      productName: string;
      customerName: string;
      rating: number;
      title: string;
      body: string;
    },
  ) {
    if (isHttpMode()) return http.post<Review>(E.reviews.create(productId), input);
    return createProductReview({ productId, ...input });
  },

  async moderate(id: string, status: ReviewStatus): Promise<void> {
    if (isHttpMode()) {
      await http.patch<void>(E.reviews.moderate(id), { status });
      return;
    }
    updateReviewStatus(id, status);
  },

  async remove(id: string): Promise<void> {
    if (isHttpMode()) {
      await http.del<void>(E.reviews.remove(id));
      return;
    }
    deleteReview(id);
  },
};
