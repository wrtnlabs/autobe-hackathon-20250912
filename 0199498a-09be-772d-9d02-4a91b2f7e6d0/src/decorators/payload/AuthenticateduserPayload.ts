import { tags } from "typia";

/** Payload for authenticateduser role. Represents a verified, active user. */
export interface AuthenticateduserPayload {
  /**
   * Top-level AuthenticatedUser ID from storyfield_ai_authenticatedusers.id -
   * always UUID.
   */
  id: string & tags.Format<"uuid">;

  /** Role discriminator for payload validation; always "authenticatedUser". */
  type: "authenticatedUser";
}
