import { tags } from "typia";

/**
 * JWT payload for Medicaldoctor role.
 *
 * - Id: Top-level doctor UUID (primary key).
 * - Type: Discriminates the payload as 'medicalDoctor'.
 */
export interface MedicaldoctorPayload {
  /** Unique doctor user ID (UUID). */
  id: string & tags.Format<"uuid">;
  /** Discriminator for Medicaldoctor union. */
  type: "medicalDoctor";
}
