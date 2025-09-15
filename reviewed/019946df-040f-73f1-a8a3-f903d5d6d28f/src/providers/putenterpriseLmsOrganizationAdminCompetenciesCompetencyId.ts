import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCompetencies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCompetencies";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Updates an existing competency by its ID.
 *
 * Validates that the competency exists and belongs to the authenticated
 * organization admin's tenant. Enforces uniqueness of competency code per
 * tenant.
 *
 * @param props - Request object containing authenticated user, competency ID,
 *   and update payload.
 * @param props.organizationAdmin - Authenticated organization admin user
 *   payload.
 * @param props.competencyId - UUID of the competency to update.
 * @param props.body - Partial update data for the competency.
 * @returns The updated competency information.
 * @throws {Error} If competency not found, unauthorized access, or duplicate
 *   code conflict.
 */
export async function putenterpriseLmsOrganizationAdminCompetenciesCompetencyId(props: {
  organizationAdmin: OrganizationadminPayload;
  competencyId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsCompetencies.IUpdate;
}): Promise<IEnterpriseLmsCompetencies> {
  const { organizationAdmin, competencyId, body } = props;

  // Find existing competency by id
  const existing = await MyGlobal.prisma.enterprise_lms_competencies.findUnique(
    {
      where: { id: competencyId },
    },
  );
  if (!existing) throw new Error("Competency not found");

  // Authorization check - tenant ownership
  if (existing.tenant_id !== organizationAdmin.tenant_id) {
    throw new Error("Unauthorized access to update competency");
  }

  // Check for code uniqueness if code is being updated
  if (body.code !== undefined && body.code !== existing.code) {
    const codeConflict =
      await MyGlobal.prisma.enterprise_lms_competencies.findFirst({
        where: { tenant_id: existing.tenant_id, code: body.code },
      });
    if (codeConflict) {
      throw new Error("Duplicate competency code within tenant");
    }
  }

  // Prepare data for update
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.enterprise_lms_competencies.update({
    where: { id: competencyId },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      description: body.description ?? undefined,
      updated_at: now,
    },
  });

  // Return updated competency with Date fields converted
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    code: updated.code,
    name: updated.name,
    description: updated.description === null ? null : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
