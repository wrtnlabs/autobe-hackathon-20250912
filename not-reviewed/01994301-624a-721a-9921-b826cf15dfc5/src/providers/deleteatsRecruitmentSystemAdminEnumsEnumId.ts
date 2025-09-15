import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft delete (retire) an enumeration value in ats_recruitment_enums by UUID
 * (systemAdmin only)
 *
 * This operation sets the deleted_at timestamp for the enum row, making it
 * unavailable to business workflows while retaining it for audit/history. Only
 * system administrators may perform this action. If the enum does not exist or
 * is already deleted, a 404 error is thrown.
 *
 * @param props - Properties for soft-deleting the enum value.
 * @param props.systemAdmin - Authenticated systemAdmin payload; authorization
 *   enforced by contract.
 * @param props.enumId - UUID of the enumeration code to be retired (soft
 *   deleted).
 * @returns Void
 * @throws {Error} If the enum does not exist or was already deleted.
 */
export async function deleteatsRecruitmentSystemAdminEnumsEnumId(props: {
  systemAdmin: SystemadminPayload;
  enumId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { enumId } = props;
  // Find the enum (not deleted)
  const row = await MyGlobal.prisma.ats_recruitment_enums.findFirst({
    where: { id: enumId, deleted_at: null },
  });
  if (!row) {
    throw new Error("Enum not found");
  }
  // Mutate deleted_at + updated_at together
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.ats_recruitment_enums.update({
    where: { id: enumId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
