import { tags } from "typia";

/**
 * Payload interface for Diaryuser JWT authentication context. Contains the
 * top-level logical mood_diary_diaryusers ID and role discriminator.
 */
export interface DiaryuserPayload {
  /** The logical diaryuser primary key (mood_diary_diaryusers.id) */
  id: string & tags.Format<"uuid">;
  /** Discriminator for Diaryuser role */
  type: "diaryUser";
}
