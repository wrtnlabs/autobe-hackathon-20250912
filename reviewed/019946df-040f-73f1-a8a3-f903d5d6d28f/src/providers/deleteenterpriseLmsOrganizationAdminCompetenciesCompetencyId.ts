import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft delete a competency by setting its deleted_at timestamp.
 *
 * This function ensures only organizationAdmins can delete competencies
 * belonging to their tenant. It performs a soft delete by updating the
 * deleted_at timestamp.
 *
 * @param props - Contains the authenticated organizationAdmin and the
 *   competency ID to delete.
 * @throws {Error} When competency not found or already deleted.
 * @throws {Error} When the organizationAdmin does not have permission to delete
 *   this competency.
 */
export async function deleteenterpriseLmsOrganizationAdminCompetenciesCompetencyId(props: {
  organizationAdmin: OrganizationadminPayload;
  competencyId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, competencyId } = props;

  // Find competency by id and soft delete status
  const competency =
    await MyGlobal.prisma.enterprise_lms_competencies.findUnique({
      where: { id: competencyId },
      select: { tenant_id: true, deleted_at: true },
    });

  if (!competency || competency.deleted_at !== null) {
    throw new Error("Competency not found");
  }

  // Authorization: Check that competency belongs to organizationAdmin's tenant
  if (competency.tenant_id !== organizationAdmin.id) {
    throw new Error("Unauthorized");
  }

  // Perform soft delete with current ISO timestamp
  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.enterprise_lms_competencies.update({
    where: { id: competencyId },
    data: {
      deleted_at: now,
    },
  });
}
