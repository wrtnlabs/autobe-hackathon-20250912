import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsCompetencies } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCompetencies";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new competency record with tenant ID, unique code, name, and
 * optional description.
 *
 * This operation requires authenticated organizationAdmin with permission to
 * manage competencies. It ensures the competency code is unique per tenant
 * organization.
 *
 * @param props - Object containing organizationAdmin payload and competency
 *   creation body
 * @param props.organizationAdmin - The authenticated organization administrator
 *   performing the operation
 * @param props.body - The competency data conforming to
 *   IEnterpriseLmsCompetencies.ICreate
 * @returns The newly created competency record with all metadata timestamps
 * @throws {Error} When a competency with the same code already exists for the
 *   tenant
 */
export async function postenterpriseLmsOrganizationAdminCompetencies(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsCompetencies.ICreate;
}): Promise<IEnterpriseLmsCompetencies> {
  const { organizationAdmin, body } = props;

  // Check for duplicate competency code within the tenant
  const existing = await MyGlobal.prisma.enterprise_lms_competencies.findFirst({
    where: {
      tenant_id: body.tenant_id,
      code: body.code,
    },
  });

  if (existing) throw new Error("Duplicate competency code for tenant");

  // Prepare current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Create new competency record
  const created = await MyGlobal.prisma.enterprise_lms_competencies.create({
    data: {
      id: v4(),
      tenant_id: body.tenant_id,
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created competency with all date fields as ISO strings
  return {
    id: created.id,
    tenant_id: created.tenant_id,
    code: created.code,
    name: created.name,
    description: created.description ?? null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
