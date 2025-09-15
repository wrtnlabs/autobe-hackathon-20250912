import { tags } from "typia";

/** Interface for JWT authenticated receptionist payload. */
export interface ReceptionistPayload {
  /** Receptionist user UUID (top-level ID). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the union type. */
  type: "receptionist";
}
