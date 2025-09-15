import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete a receptionist account by receptionistId (hard delete) in
 * healthcare_platform_receptionists.
 *
 * This operation irrevocably removes the specified receptionist record from the
 * database. Hard delete is permitted only when the receptionist is not
 * currently archived (deleted_at is null). If the receptionist account is
 * archived for data retention/compliance, deletion is blocked to honor
 * regulatory retention policies.
 *
 * Only organization administrators may perform this operation. All successful
 * and blocked deletions are subject to auditing via system mechanisms outside
 * this function.
 *
 * @param props.organizationAdmin - Authenticated payload for the acting
 *   organization administrator
 * @param props.receptionistId - Unique identifier (UUID) of the receptionist to
 *   be deleted
 * @returns Void
 * @throws {Error} If the receptionist record does not exist, or deletion is
 *   blocked due to compliance retention (archived/soft-deleted)
 */
export async function deletehealthcarePlatformOrganizationAdminReceptionistsReceptionistId(props: {
  organizationAdmin: OrganizationadminPayload;
  receptionistId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { receptionistId } = props;
  const receptionist =
    await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
      where: {
        id: receptionistId,
      },
    });
  if (!receptionist) {
    throw new Error("Receptionist not found");
  }
  if (receptionist.deleted_at !== null) {
    throw new Error(
      "Receptionist is archived for compliance and cannot be hard deleted.",
    );
  }
  await MyGlobal.prisma.healthcare_platform_receptionists.delete({
    where: {
      id: receptionistId,
    },
  });
  // No content returned (void)
}
