import { tags } from "typia";

export interface DeveloperPayload {
  /**
   * Top-level developer table ID (the fundamental user identifier in the
   * system).
   */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "developer";
}
