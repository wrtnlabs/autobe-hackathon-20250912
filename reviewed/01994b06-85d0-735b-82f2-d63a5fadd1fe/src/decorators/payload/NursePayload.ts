import { tags } from "typia";

/**
 * Nurse JWT Payload Always contains the nurse id (top-level actor identifier),
 * and role discriminator.
 */
export interface NursePayload {
  /** Nurse user ID (UUID) */
  id: string & tags.Format<"uuid">;

  /** Role discriminator for nurse */
  type: "nurse";
}
