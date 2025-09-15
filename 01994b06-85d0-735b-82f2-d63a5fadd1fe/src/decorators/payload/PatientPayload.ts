import { tags } from "typia";

/** JWT payload type for a Patient user (top-level patient table ID) */
export interface PatientPayload {
  /** Patient's table ID (UUID, fundamental user identifier) */
  id: string & tags.Format<"uuid">;

  /** Role type discriminator for Patient */
  type: "patient";
}
