import { tags } from "typia";

/**
 * Authentication payload for technician role.
 *
 * @property id Top-level user id for technician (UUID)
 * @property type Discriminator for role union ("technician")
 */
export interface TechnicianPayload {
  /** Top-level user table ID (the fundamental user identifier in the system). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for the discriminated union type. */
  type: "technician";
}
