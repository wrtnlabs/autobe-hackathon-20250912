import { tags } from "typia";

/**
 * JWT payload structure for Department Head authentication. id: Top-level
 * department head user UUID (primary key) type: Discriminator
 * ("departmentHead")
 */
export interface DepartmentheadPayload {
  /** Top-level department head user table ID (UUID). */
  id: string & tags.Format<"uuid">;

  /** Discriminator for departmentHead role. */
  type: "departmentHead";
}
